// ============================================================
// Axon — CourseToolbar (shared)
//
// Renders the course selector dropdown + topic count badge.
// Used in both QuizView header and ProfessorQuizzesPage header.
// ============================================================

import React from 'react';
import type { Course } from '@/app/services/quizApi';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';
import { GraduationCap } from 'lucide-react';

interface CourseToolbarProps {
  courses: Course[];
  selectedCourse: Course | null;
  onCourseChange: (course: Course | null) => void;
  treeLoading: boolean;
  totalTopics: number;
}

export function CourseToolbar({
  courses,
  selectedCourse,
  onCourseChange,
  treeLoading,
  totalTopics,
}: CourseToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      {courses.length > 1 && (
        <Select
          value={selectedCourse?.id || ''}
          onValueChange={id => onCourseChange(courses.find(c => c.id === id) || null)}
        >
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-sm w-[200px]">
            <SelectValue placeholder="Curso..." />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            {courses.map(c => (
              <SelectItem key={c.id} value={c.id} className="text-white text-sm">
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex items-center gap-2 px-4 py-2 bg-violet-600/20 rounded-full border border-violet-500/20 shrink-0">
        <GraduationCap size={14} className="text-violet-400" />
        <span className="text-xs text-violet-300">
          {treeLoading ? 'Cargando...' : `${totalTopics} topicos`}
        </span>
      </div>
    </div>
  );
}
