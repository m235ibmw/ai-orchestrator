import { getCourseById } from '@/lib/courses';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ClassroomPage({ params }: PageProps) {
  const { id } = await params;
  const course = getCourseById(id);

  if (!course) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="container mx-auto">
          <Link href="/home" className="text-sm hover:underline mb-2 block">
            ← 授業一覧に戻る
          </Link>
          <h1 className="text-2xl font-bold">{course.name}</h1>
          <p className="text-sm mt-1">{course.description}</p>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <div className="space-y-4">
          {course.lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="lesson-item bg-white p-6 rounded-lg shadow-md"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold mb-2">
                    第{lesson.number}回: {lesson.title}
                  </h2>
                  <p className="text-gray-600">{lesson.description}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="font-semibold mb-2">教材資料</h3>
                <div className="flex gap-4">
                  <a
                    href={lesson.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pdf-link text-blue-600 hover:text-blue-800 underline"
                  >
                    PDFをプレビュー
                  </a>
                  <a
                    href={lesson.pdfUrl}
                    download
                    className="text-green-600 hover:text-green-800 underline"
                  >
                    PDFをダウンロード
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
