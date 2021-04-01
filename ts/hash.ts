/**
 * Hash
 * 
 * bcryptを用いてパスワードのハッシュ化や比較などを行う
 * インスタンス化不要
 */
export class Hash {
    /** bcrypt変数 */
    public static bcrypt = require("bcrypt")
    /** ソルトラウンド数 */
    public static readonly SALTROUNDS = 10 // your saltrounds here!
}