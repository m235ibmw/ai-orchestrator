import { courses } from '@/lib/courses';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">学習管理システム</h1>
          <p className="text-sm mt-1">受講中の授業一覧</p>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/classroom/${course.id}`}
              className="course-item bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            >
              <h2 className="text-xl font-bold mb-2">{course.name}</h2>
              <p className="text-gray-600 mb-4">{course.description}</p>
              <div className="text-sm text-blue-600">
                全{course.lessons.length}回の授業
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
