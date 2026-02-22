// ============================================================
// Axon — ContentTreeGrid
//
// Shared component that renders the Semester → Section card →
// Topic list grid. Used by both QuizView and ProfessorQuizzesPage.
// ============================================================

import React from 'react';
import type { ContentTree, ContentTreeTopic } from '@/app/services/contentTreeBuilder';
import { BookOpen, ChevronRight, Loader2 } from 'lucide-react';

export interface ContentTreeGridProps {
  tree: ContentTree;
  /** Called when a topic is clicked */
  onTopicClick: (topic: ContentTreeTopic) => void;
  /** ID of the topic currently loading (shows spinner) */
  loadingTopicId?: string | null;
}

export function ContentTreeGrid({ tree, onTopicClick, loadingTopicId }: ContentTreeGridProps) {
  return (
    <div className="space-y-10">
      {tree.semesters.map(semester => (
        <div key={semester.id}>
          {/* Semester heading */}
          <h2 className="text-base text-white mb-5 pl-4 border-l-2 border-violet-500 flex items-center gap-2">
            {semester.name}
          </h2>

          {/* Section cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {semester.sections.map(section => (
              <div
                key={section.id}
                className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 hover:border-zinc-700 transition-all group flex flex-col h-full"
              >
                {/* Section header */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-zinc-800/80">
                  <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center text-violet-400 transition-colors group-hover:bg-violet-500 group-hover:text-white">
                    <BookOpen size={18} />
                  </div>
                  <h3 className="text-sm text-white leading-tight">{section.name}</h3>
                </div>

                {/* Topics list */}
                <div className="space-y-0.5 flex-1">
                  {section.topics.length === 0 && (
                    <p className="text-xs text-zinc-600 py-2">Sin topicos</p>
                  )}
                  {section.topics.map(topic => {
                    const isLoading = loadingTopicId === topic.id;
                    return (
                      <button
                        key={topic.id}
                        onClick={() => onTopicClick(topic)}
                        disabled={!!loadingTopicId}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg text-sm transition-all text-left hover:bg-violet-500/10 text-zinc-400 hover:text-violet-300 cursor-pointer disabled:opacity-50"
                      >
                        <span className="truncate pr-2">{topic.name}</span>
                        <span className="shrink-0">
                          {isLoading ? (
                            <Loader2 size={13} className="animate-spin text-violet-400" />
                          ) : (
                            <ChevronRight size={14} className="text-zinc-700" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Empty sections */}
          {semester.sections.length === 0 && (
            <p className="text-sm text-zinc-700 ml-4">Sin secciones en este semestre</p>
          )}
        </div>
      ))}
    </div>
  );
}
