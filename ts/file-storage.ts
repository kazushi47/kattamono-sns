import { Storage } from "@google-cloud/storage"

/**
 * FileStorage
 * 
 * 画像ファイルをCloud Storageで扱う
 */
export class FileStorage {
    /** 保存するファイルのパス名 */
    public filepath: string

    /** バケットの名前 */
    private readonly BUCKET_NAME = "<your bucket name here!>"
    /** Cloud StorageのFQDN */
    private readonly FQDN = "https://storage.googleapis.com"
    /** Storageインスタンス */
    private storage = new Storage({
        keyFilename: "<your key's path here!>.json"
    })

    /**
     * メインコンストラクタ
     * @param user_id 投稿者ユーザID
     * @param post_id 投稿POSTのID
     * @param filename オリジナルファイル名
     */
    constructor(user_id: string, post_id: any, filename: string) {
        /* ファイルパスを作成 */
        this.filepath = "post_files/" + user_id + "/" + post_id + "/" + filename
    }

    /**
     * 指定されたファイル名でファイルデータを保存
     * @param data ファイルデータ
     */
    public async upload(data: any) {
        var flg: boolean = false

        await this.storage.bucket(this.BUCKET_NAME).file(this.filepath).save(data, (err: any) => {
            if (!err) {
                flg = true
            } else {
                console.log(err)
            }
        })

        return flg
    }

    /**
     * ファイルを削除
     */
    public async remove() {
        await this.storage.bucket(this.BUCKET_NAME).file(this.filepath).delete()
    }

    /**
     * 保存したファイルの公開URLを取得
     * @returns ファイルの公開URL
     */
    public getUrl(): string {
        return this.FQDN + "/" + this.BUCKET_NAME + "/" + this.filepath
    }
}