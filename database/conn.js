const mysql2 = require('./mysql2')

/**
    -- 현재 접속 수
    SHOW STATUS LIKE 'Threads_connected';

    -- 최대 접속 수
    SHOW VARIABLES LIKE '%max_connection%';
*/

/**
 * DB 데이터베이스 스키마명
 */
module.exports.table_schema = "chat";

/**
 * SelectList
 * No Parameter Binding
 * 
 * @param {*} sql 
 * @returns 
 */
module.exports.select = async (sql) => {
    let conn = null;

    try {    
        conn = await mysql2.getConnection();
        let query = await this.execute(conn, sql);
        return query.result;
    } catch (err) {
        return await this.err_message_filter(err);
    } finally {
        if (null !== conn) {
            conn.release();
        }
    }
}

/**
 * SelectList
 * Parameter Binding
 * 
 * @param {*} sql
 * @param {*} params
 * @returns 
 */
module.exports.select = async (sql, params) => {
    let conn = null;

    if ((params !== null && params !== undefined) && (params.length !== sql.split('?').length - 1)) {
        console.log("Query Binding Length Error !");
        console.log(sql)
        return [];
    }

    try {    
        conn = await mysql2.getConnection();

        // params가 null일 경우
        if (params !== null && params !== undefined && params.length > 0) {
            let query = await this.execute(conn, sql, params);
            return query.result;
        } else {
            let query = await this.execute(conn, sql);
            return query.result;
        }
    } catch (err) {
        return await this.err_message_filter(err);
    } finally {
        if (null !== conn) {
            conn.release();
        }
    }
}

/**
 * SelectOne
 * No Parameter Binding
 * 
 * @param {*} sql
 * @returns 
 */
module.exports.selectOne = async (sql) => {
    let conn = null;

    try {    
        conn = await mysql2.getConnection();
        let query = await this.execute(conn, sql);
        return query.result[0];
    } catch (err) {
        return await this.err_message_filter(err);
    } finally {
        if (null !== conn) {
            conn.release();
        }
    }
}

/**
 * SelectOne
 * Parameter Binding
 * 
 * @param {*} sql
 * @param {*} params
 * @returns 
 */
module.exports.selectOne = async (sql, params) => {
    let rt = null;
    let conn = null;

    if ((params !== null && params !== undefined) && (params.length !== sql.split('?').length - 1)) {
        console.log("Query Binding Length Error !");
        console.log(sql)
        return null;
    }

    try {    
        conn = await mysql2.getConnection();

        // params가 null일 경우
        if (params !== null && params !== undefined && params.length > 0) {
            let query = await this.execute(conn, sql, params);
            return query.result[0];
        } else {
            let query = await this.execute(conn, sql);
            return query.result[0];
        }
    } catch (err) {
        return await this.err_message_filter(err);
    } finally {
        if (null !== conn) {
            conn.release();
        }
    }
}

/**
 * insert, update, delete
 * 
 * 트렌젝션 사용을 위해 커넥션은 호출하는 곳에서 생성한 후 받아 사용한다.
 * @param {*} conn 
 * @param {*} sql 
 * @returns 
 */
module.exports.execute = async (conn, sql) => {
    let rt = null;

    try {    
        const [ result ] = await conn.query(sql);
        rt = result;
        
        rt = {
            success: true,
            result: rt
        }
    } catch (err) {
        conn.rollback();
        rt = {
            success: false,
            errno: err.errno,
            err: await this.err_message_filter(err)
        }
    }

    return rt;
}

/**
 * insert, update, delete
 * Parameter Binding
 * 
 * 트렌젝션 사용을 위해 커넥션은 호출하는 곳에서 생성한 후 받아 사용한다.
 * @param {*} conn 
 * @param {*} sql 
 * @param {*} params 
 * @returns 
 */
module.exports.execute = async (conn, sql, params) => {
    let rt = null;

    if ((params !== null && params !== undefined ) && (params.length !== sql.split('?').length - 1)) {
        conn.rollback();
        console.log("Query Binding Length Error !");
        console.log(sql)
        return {
            success: false,
            err: 'Query Binding Length Error !'
        };
    }

    try {    
        // params가 null일 경우
        if (params !== null && params !== undefined && params.length > 0) {
            const [ result ] = await conn.query(sql, params);
            rt = result;
        } else {
            const [ result ] = await conn.query(sql);
            rt = result;
        }

        rt = {
            success: true,
            result: rt
        }
    } catch (err) {
        conn.rollback();
        rt = {
            success: false,
            errno: err.errno,
            err: await this.err_message_filter(err)
        }
    }

    return rt;
}

/**
 * 에러메시지 필터
 * 
 * @param {*} msg
 */
module.exports.err_message_filter = async (err) => {
    let msg = err.toString();

    if (err.errno === 1062) { // 값이 중복될 경우
        let index1 = msg.indexOf("entry") + 7;
        let index2 = msg.indexOf("for") - 2;
        msg = `${msg.substring(index1, index2)}(은)는 이미 등록되어 있는 값입니다.`;
    } else if (err.errno === 1406) { // 데이터 길이가 긴 경우
        let index1 = msg.indexOf("column") + 8;
        let index2 = msg.indexOf("at row") - 2;
        msg = `${await this.getColumnMemo(msg.substring(index1, index2))}의 길이가 너무 깁니다.`
    } else if (err.errno === 1452) { // 올바르지 않은 외래키 입력
        let index1 = msg.indexOf("FOREIGN KEY") + 14;
        let index2 = msg.indexOf("REFERENCES") - 3  ;
        msg = `${await this.getColumnMemo(msg.substring(index1, index2))}의 값이 올바르지 않습니다.`;
    } else {
        msg = `${err.code}(${err.errno})`;
    }

    return msg;
}

/**
 * 컬럼 메모 얻기
 */
module.exports.getColumnMemo = async (column) => {
    let sql = `
                select
                    case
                        when count(*) > 0 then a.memo
                        else ?
                        end as memo
                from (
                        select 
                            column_comment as memo
                        from 
                            INFORMATION_SCHEMA.COLUMNS
                        where 
                            COLUMN_NAME = ?
                            and TABLE_SCHEMA = ?
                            and column_comment is not null
                            and column_comment != ''
                            limit 0, 1
                ) a
    `;
    return (await this.selectOne(sql, [column, column, table_schema]))['memo'];
}