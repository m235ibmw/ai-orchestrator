/**
 * GitHub の workflows ディレクトリから Markdown ファイル一覧を取得
 */
export declare function getWorkflowList(): Promise<{
    error: boolean;
    message: string;
    ok?: never;
    count?: never;
    files?: never;
} | {
    ok: boolean;
    count: number;
    files: any[];
    error?: never;
    message?: never;
}>;
//# sourceMappingURL=getWorkflowList.d.ts.map