// ============================================================
// Axon — QuestionDialog
// Create / Edit dialog for quiz questions (professor CRUD).
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import * as quizApi from '@/app/services/quizApi';
import type { QuizQuestion } from '@/app/services/quizApi';
import { QUESTION_TYPES, DIFFICULTIES } from '@/app/components/shared/QuestionBadges';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/app/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Plus, X, Loader2 } from 'lucide-react';

interface QuestionDialogProps {
  open: boolean;
  onClose: () => void;
  editingQuestion: QuizQuestion | null;
  summaryId: string;
  onSave: (data: quizApi.CreateQuizQuestionPayload) => Promise<void>;
  saving: boolean;
}

export function QuestionDialog({ open, onClose, editingQuestion, summaryId, onSave, saving }: QuestionDialogProps) {
  const [questionType, setQuestionType] = useState<string>('multiple_choice');
  const [question, setQuestion] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [explanation, setExplanation] = useState('');
  const [difficulty, setDifficulty] = useState<string>('medium');

  useEffect(() => {
    if (open) {
      if (editingQuestion) {
        setQuestionType(editingQuestion.question_type);
        setQuestion(editingQuestion.question);
        setCorrectAnswer(editingQuestion.correct_answer);
        setOptions(editingQuestion.options || ['', '', '', '']);
        setExplanation(editingQuestion.explanation || '');
        setDifficulty(editingQuestion.difficulty);
      } else {
        setQuestionType('multiple_choice');
        setQuestion('');
        setCorrectAnswer('');
        setOptions(['', '', '', '']);
        setExplanation('');
        setDifficulty('medium');
      }
    }
  }, [open, editingQuestion]);

  // Reset correctAnswer when question type changes to avoid stale values
  const handleQuestionTypeChange = useCallback((newType: string) => {
    setQuestionType(prev => {
      if (prev !== newType) setCorrectAnswer('');
      return newType;
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: quizApi.CreateQuizQuestionPayload = {
      summary_id: summaryId,
      question_type: questionType,
      question,
      correct_answer: correctAnswer,
      difficulty,
    };
    if (questionType === 'multiple_choice') {
      data.options = options.filter(o => o.trim());
    }
    if (explanation.trim()) data.explanation = explanation;
    onSave(data);
  };

  const updateOption = (idx: number, val: string) => {
    setOptions(prev => prev.map((o, i) => i === idx ? val : o));
  };

  const addOption = () => setOptions(prev => [...prev, '']);
  const removeOption = (idx: number) => setOptions(prev => prev.filter((_, i) => i !== idx));

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">{editingQuestion ? 'Editar Pregunta' : 'Nueva Pregunta'}</DialogTitle>
          <DialogDescription className="text-zinc-500">
            {editingQuestion ? 'Modifica los campos y guarda.' : 'Completa los campos para crear una pregunta.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-400 text-xs">Tipo de pregunta</Label>
              <Select value={questionType} onValueChange={handleQuestionTypeChange}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {QUESTION_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Dificultad</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {DIFFICULTIES.map(d => <SelectItem key={d.value} value={d.value} className="text-white">{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-zinc-400 text-xs">Pregunta</Label>
            <Textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="Escribe la pregunta aqui..."
              className="bg-zinc-800 border-zinc-700 text-white mt-1.5 min-h-[80px]" required />
          </div>

          {questionType === 'multiple_choice' && (
            <div>
              <Label className="text-zinc-400 text-xs mb-2 block">Opciones</Label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={`dialog-opt-${idx}`} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 w-5 shrink-0">{String.fromCharCode(65 + idx)}.</span>
                    <Input value={opt} onChange={e => updateOption(idx, e.target.value)}
                      placeholder={`Opcion ${String.fromCharCode(65 + idx)}`}
                      className="bg-zinc-800 border-zinc-700 text-white text-sm" />
                    {options.length > 2 && (
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-rose-400 shrink-0" onClick={() => removeOption(idx)}>
                        <X size={12} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {options.length < 8 && (
                <Button type="button" variant="ghost" size="sm" className="mt-2 text-zinc-500 hover:text-violet-400" onClick={addOption}>
                  <Plus size={12} /> Agregar opcion
                </Button>
              )}
            </div>
          )}

          <div>
            <Label className="text-zinc-400 text-xs">Respuesta correcta</Label>
            {questionType === 'true_false' ? (
              <Select value={correctAnswer} onValueChange={setCorrectAnswer}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1.5"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="true" className="text-white">Verdadero</SelectItem>
                  <SelectItem value="false" className="text-white">Falso</SelectItem>
                </SelectContent>
              </Select>
            ) : questionType === 'multiple_choice' ? (
              <Select value={correctAnswer} onValueChange={setCorrectAnswer}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1.5"><SelectValue placeholder="Seleccionar la opcion correcta..." /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {options.filter(o => o.trim()).map((opt, idx) => (
                    <SelectItem key={`correct-${idx}`} value={opt} className="text-white">{String.fromCharCode(65 + idx)}. {opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Textarea value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)}
                placeholder="Respuesta correcta esperada..." className="bg-zinc-800 border-zinc-700 text-white mt-1.5" required />
            )}
          </div>

          <div>
            <Label className="text-zinc-400 text-xs">Explicacion (opcional)</Label>
            <Textarea value={explanation} onChange={e => setExplanation(e.target.value)}
              placeholder="Por que esta es la respuesta correcta..." className="bg-zinc-800 border-zinc-700 text-white mt-1.5" />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-zinc-400">Cancelar</Button>
            <Button type="submit" disabled={saving || !question.trim() || !correctAnswer.trim()} className="bg-violet-600 hover:bg-violet-700 text-white">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editingQuestion ? 'Guardar Cambios' : 'Crear Pregunta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}