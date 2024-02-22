const db = require('../../database/conn');
const mysql2 = require('../../database/mysql2');

/**
 * 로그인된 회원 정보
 * 
 * @param {*} token 
 */
module.exports.info = async (token) => {
    let params = [token];
    let sql = ` 
                select 
                      a.token 
                    , u.user_seq
                    , u.user_id
                    , u.user_nm
                    , u.user_nick
                    , u.user_birth
                    , u.user_mobile
                    , us.user_s_seq
                    , us.user_s_nm 
                    , ul.user_l_seq
                    , ul.user_l_nm 
                    , case
                        when u.mobile_cert_seq is null then 'Y'
                        else 'N'
                        end as mobile_cert_yn
                    , u.use_yn
                    , date_format(u.reg_dt, '%Y-%m-%d') as reg_dt
                from 
                    t_user_login a
                        left join t_user_login b 
                    on a.user_seq = b.user_seq 
                        left join t_user u
                    on a.user_seq = u.user_seq 
                        left join t_user_status us
                    on u.user_s_seq = us.user_s_seq 
                        left join t_user_level ul
                    on u.user_l_seq = ul.user_l_seq 
                where 
                    u.use_yn = 'Y'
                    and b.token = ?
                order by
                    a.login_dt desc
                limit 0, 1
    `;
    return await db.selectOne(sql, params);
}

/**
 * 채팅참가 가능여부 확인
 * 
 * @param {*} user_seq 
 * @param {*} trl_seq 
 */
module.exports.checkRoomJoin = async (user_seq, trl_seq) => {
    let conn = await mysql2.getConnection();
    try {
        let params = [trl_seq];
        let sql = `
                    select 
                        tl.trl_seq
                        , trs.trs_code 
                        , ts.tr_s_code  
                        , DATEDIFF(now(), t.mod_dt) as day
                        , tl.user_seq as buyer
                        , t.user_seq as seller
                    from
                        t_trade_log tl
                            left join t_trade_step trs
                        on tl.trs_seq = trs.trs_seq 
                            left join t_trade t
                        on tl.tr_seq = t.tr_seq 
                            left join t_trade_status ts
                        on t.tr_s_seq = ts.tr_s_seq 
                    where
                        tl.trl_seq = ?
        `;
        let query = await db.execute(conn, sql, params);
        if (query.result.length <= 0) {
            return {
                success: false,
                err: '거래정보가 올바르지 않습니다.'
            }
        }

        // 거래정보
        let info = query.result[0];

        // 1. 거래자 확인
        if (info.buyer !== user_seq && info.seller !== user_seq) {
            return {
                success: false,
                err: '권한이 없습니다.'
            }
        }

        // 2. 거래중이거나 종료 후 3일까지만 채팅가능
        if (info.trs_code !== 'ING' && (info.trs_code === 'COMPLETE' && day > 3)) {
            return {
                success: false,
                err: '종료된 거래입니다.'
            }
        }

        return {
            success: true
        }
    } catch (e) {
        return {
            success: false,
            err: e.toString()
        }
    } finally {
        conn.release();
    }
}