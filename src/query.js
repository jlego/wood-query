// 查询对象类
// by YuRonghui 2018-2-6
const { Util } = require('wood-util')();

class Query {
  constructor(params = {}) {
    this._isQuery = true;
    if(!params.where) params = { where: params };
    this.data = { //查询条件
      where: {},
      select: {
        _id: 0
      },
      sort: {
        rowid: -1
      },
      skip: 0,
      limit: 0,
      aggregate: [],
      ...params
    };
  }
  where(params = {}) {
    if(!Util.isEmpty(params)){
      let obj = {};
      for (let key in params) {
        if(key === 'limit') this.limit(params[key]);
        if(key === 'sort') this.sort(params[key]);
        if(key === 'select') this.select(params[key]);
        if(['largepage', 'page', 'limit', 'sort', 'where'].includes(key)) continue;
        if (Array.isArray(params[key])) {
          obj[key] = {
            $in: params[key]
          };
        } else {
          if(typeof params[key] == 'object'){
            if(params[key].like){ // 模糊查询
              obj[key] = {
                $regex: params[key].like
              };
            }else if(params[key].search){ // 全文搜索
              obj['$text'] = {
                $search: params[key].search
              };
            }else{
              obj[key] = params[key];
            }
          }else{
            obj[key] = {
              $eq: params[key]
            };
          }
        }
      }
      Object.assign(this.data.where, obj);
    }
    return this;
  }
  select(params = {}) {
    Object.assign(this.data.select, params);
    return this;
  }
  sort(params = {}) {
    Object.assign(this.data.sort, params);
    return this;
  }
  skip(val = 0) {
    this.data.skip = val;
    return this;
  }
  limit(val) {
    if (val) this.data.limit = parseInt(val);
    return this;
  }
  addFields(item = {}) {
    let fieldName = item.as;
    if (fieldName) {
      if (this.data.select[fieldName]) {
        this.data.addFields = this.data.addFields || {};
        if (item.relation == 'one') {
          // 一对一
          this.data.addFields[fieldName] = {
            $cond: {
              if: {
                $isArray: `$${fieldName}`
              },
              then: {
                $cond: {
                  if: {
                    $gt: [{
                      $size: `$${fieldName}`
                    }, 0]
                  },
                  then: {
                    $arrayElemAt: [`$${fieldName}`, 0]
                  },
                  else: {}
                }
              },
              else: `$${fieldName}`
            }
          };
        } else if (item.relation == 'many') {
          // 一对多
          // 过滤
          if (item.filter) {
            this.data.addFields[fieldName] = {
              $filter: {
                input: `$${fieldName}`,
                as: "item",
                cond: item.filter
              }
            };
          } else {
            // 条数
            let size = item.size || 10;
            this.data.addFields[fieldName] = {
              $slice: [`$${fieldName}`, size]
            };
          }
        }
      }
    }
  }
  // 关联表
  // key: '查询键'
  // as: '新字段名'
  // from: '来源表'
  populate(data = {}) {
    this.data.aggregate = [];
    for (let key in data) {
      let item = data[key];
      this.addFields(item);
      this.data.aggregate.push({
        "$lookup": {
          "from": item.from,
          "localField": key,
          "foreignField": item.key,
          "as": item.as
        }
      });
    }
    if (this.data.where) {
      this.data.aggregate.push({
        "$match": this.data.where
      });
    }
    if (this.data.select) {
      this.data.aggregate.push({
        "$project": this.data.select
      });
    }
    if (this.data.addFields) {
      this.data.aggregate.push({
        "$addFields": this.data.addFields
      });
    }
    if (this.data.skip) {
      this.data.aggregate.push({
        "$skip": this.data.skip
      });
    }
    if (this.data.limit) {
      this.data.aggregate.push({
        "$limit": this.data.limit
      });
    }
    if (this.data.sort) {
      this.data.aggregate.push({
        "$sort": this.data.sort
      });
    }
    return this;
  }
  toJSON() {
    return this.data;
  }
  static getQuery(opts = {}) {
    let body = Util.getParams(req);
    if(body && body.data) opts = body.data;
    let query = new Query(opts);
    return query;
  }
}

module.exports = Query;
