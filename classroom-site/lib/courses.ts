import coursesData from '@/data/courses.json';

export interface Lesson {
  id: string;
  number: number;
  title: string;
  description: string;
  pdfUrl: string;
  formUrl?: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  lessons: Lesson[];
}

export interface CoursesData {
  courses: Course[];
  credentials: {
    username: string;
    password: string;
  };
}

export const courses: Course[] = coursesData.courses;
export const credentials = coursesData.credentials;

export function getCourseById(id: string): Course | undefined {
  return courses.find((course) => course.id === id);
}

export function getLessonById(lessonId: string): { course: Course; lesson: Lesson } | undefined {
  for (const course of courses) {
    const lesson = course.lessons.find((l) => l.id === lessonId);
    if (lesson) {
      return { course, lesson };
    }
  }
  return undefined;
}
