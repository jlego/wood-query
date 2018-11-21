// 查询对象类
// by YuRonghui 2018-2-6
const { Util } = require('wood-util')();

class Query {
  constructor({select, sort, skip, limit, aggregate, largepage, where, ...other}) {
    this._isQuery = true;
    this.data = { //查询条件
      where: where || {},
      select: {},
      sort: {},
      skip: 0,
      limit: 0,
      aggregate: aggregate || []
    };
    if(select) this.select(select);
    if(sort) this.sort(sort);
    if(skip) this.skip(skip);
    if(limit) this.limit(limit);
    if(where) this.where(where);
    if(other) this.where(other);
  }
  where(params = {}) {
    if(!Util.isEmpty(params)){
      let obj = {};
      for (let key in params) {
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
    return new Query(opts);
  }
}

module.exports = Query;
