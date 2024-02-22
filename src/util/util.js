const moment = require('moment');
const bcrypt = require("bcryptjs");
const PageClass = require('./class/PageClass');
const sms = require('./sms');

/**
 * Null, Undefined 체크
 * @param {*} v 변수
 */
module.exports.isNull = (v) => {
    if (v !== undefined && v !== null && v !== '') {
        return true;
    } else {
        return false;
    }
}
  
/**
 * Null, Undefined일 경우 지정한 값으로 리턴
 * @param {*} v 변수
 * @param {*} d 변수가 isNull을 충족하지 못하는 경우 리턴되는 값
*/
module.exports.d_null = (v, d) => {
    return this.isNull(v) ? v : d;
}

/**
 * 해당 숫자가 Null, Undefined가 아니고 숫자인지 판단한 후 리턴
 * @param {*} v 변수
 */
module.exports.isNum = (v) => {
    try {
        if (this.isNull(v) && !isNaN(v)) {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        return false;
    }
}

/**
 * 해당 숫자가 Null, Undefined 또는 숫자가 아닐경우 지정한 값으로 리턴
 * @param {*} v 변수
 * @param {*} d 변수가 isNum을 충족하지 못하는 경우 리턴되는 값
 */
module.exports.d_num = (v, d) => {
    if (this.isNum(v)) {
        return v;
    } else {
        if (this.isNum(d)) {
            return d;
        } else {
            return 0;
        }
    }
}

/**
 * 10보다 작은 수 "0" 으로 채우기
 * 
 * @param {*} v 
 */
module.exports.addZero = (v) => {
    if (this.isNull(v)) {
        if (parseInt(v) < 10) {
            v = "0" + v;
        } else {
            v = "" + v;
        }
    
        return v;
    } else {
        return "01";
    }
}

/**
 * 데이터 형식 얻기
 * 
 * @param {*} v 
 */
module.exports.getDataType = (v) => {
    if (typeof v === 'string') {
        return 'String'
    } else if (typeof v === 'object') {
        return Array.isArray(v) ? 'Array' : 'Object';
    } else if (typeof v === 'number') {
        return Number.isInteger(v) ? 'Integer' : 'Float';
    }
}

/**
 * 페이지를 그려줄 정보를 얻는다.
 * limit Start, End값 얻어서 그려주기용
 * 
 * @param {*} page 현재 페이지 (마지막 페이지보다 클 경우, 마지막 페이지로 낮추어 리턴한다.)
 * @param {*} totalCount 총 개수
 * @param {*} size 페이지당 보일 객체 수
 * @param {*} pageSize 화면에 보여질 페이지 개수
 */
module.exports.getPageInfo = (page, totalCount, size, pageSize) => {
    return new PageClass({page, totalCount, size, pageSize});
}

/**
 * 배열에 들어있는 데이터를 in 절에서 사용할 수 있게 변환(문자)
 * @param {*} list 
 */
module.exports.query_array_to_string = (list) => {
    return "'" + list.join("','") + "'";
}

/**
 * 배열에 들어있는 데이터를 in 절에서 사용할 수 있게 변환(숫자)
 * @param {*} list 
 */
module.exports.query_array_to_integer = (list) => {
    return list.join(",");
}

/**
 * 전화번호 유효성 체크
 * 
 * @param {*} mobile 
 */
module.exports.checkMobile = (mobile) => {
    if (/^010-[0-9]{4}-[0-9]{4}$/.test(mobile)) {
        return true;
    } else {
        return false;
    }
}

/**
 * 생년월일 유효성 체크
 * 
 * @param {*} birth 
 * @returns 
 */
module.exports.checkBirth = (birth) => {
    birth = moment(birth).format('YYYY-MM-DD'); 
    if (birth !== 'Invalid date') {
        return true;
    } else {
        return false;
    }
}

/**
 * Bcrypt 암호화
 * 
 * @param {*} str 
 * @returns 
 */
module.exports.changeBcryptString = async (str) => {
    return await bcrypt.hash(str, 8);
}

/**
 * Bcrypt 비교
 * 
 * @param {*} strA 
 * @param {*} strB 
 */
module.exports.matchBcryptString = async (strA, strB) => {
    let match1 = await bcrypt.compare(strA, strB);
    let match2 = await bcrypt.compare(strB, strA);
    return match1 || match2;
}

/**
 * 자리수만큼의 랜덤 번호 생성
 * 
 * @param {*} length 
 */
module.exports.createRandomNumbers = (length) => {
    let numbers = "";
    for (let i=0; i<length; i++) {
        numbers += Math.floor(Math.random() * 10);
    }
    
    return numbers;
}

/**
 * 모바일 인증번호 보내기
 * 
 * @param {*} mobile 
 * @param {*} number 
 */
module.exports.sendSMS = (mobile, number) => {
    sms.sendSMS(`+82${mobile}`, `[FreeMerket] 인증번호 ${number}`, (err, result)=>{
        console.log("RESULTS: ",err,result)
    });
}