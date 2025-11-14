interface LoginCredentials {
    username: string;
    password: string;
}
interface LessonInfo {
    success: boolean;
    pdf_url?: string;
    pdf_file_path?: string;
    lesson_title?: string;
    course_name?: string;
    error?: string;
}
export declare function closeBrowser(): Promise<void>;
export declare function getLessonPdfUrl(courseName: string, lessonNumber: number, credentials: LoginCredentials, baseUrl?: string): Promise<LessonInfo>;
export {};
//# sourceMappingURL=browser.d.ts.map