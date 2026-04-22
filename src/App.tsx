/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  FileText, 
  Users, 
  BrainCircuit, 
  Download, 
  Upload, 
  ChevronRight, 
  AlertCircle,
  CheckCircle2,
  ListRestart,
  MessageSquareQuote,
  Loader2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeIndictment, analyzeTestimony, generateCrossExamination } from './lib/gemini';
import { parseFile } from './lib/docParser';
import { exportCaseToWord } from './lib/wordExport';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Step = 'upload' | 'indictment' | 'evidence' | 'analysis' | 'strategy';

interface Testimony {
  id: string;
  name: string;
  content: string;
}

export default function App() {
  const [activeStep, setActiveStep] = useState<Step>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [indictmentText, setIndictmentText] = useState('');
  const [caseData, setCaseData] = useState<{
    indictment: { facts: string; laws: string[]; elements: string[] };
    testimonies: Testimony[];
    analysis: any[];
    questions: any[];
  }>({
    indictment: { facts: '', laws: [], elements: [] },
    testimonies: [],
    analysis: [],
    questions: []
  });

  const handleIndictmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    try {
      const text = await parseFile(file);
      const analysis = await analyzeIndictment(text);
      setCaseData(prev => ({ ...prev, indictment: analysis }));
      setIndictmentText(text);
      setActiveStep('indictment');
    } catch (error) {
      console.error("Error processing indictment:", error);
      alert("解析起訴書失敗，請檢查檔案格式。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setIsLoading(true);
    try {
      const newTestimonies: Testimony[] = [];
      for (const file of files) {
        const text = await parseFile(file);
        newTestimonies.push({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name.replace(/\.[^/.]+$/, ""),
          content: text
        });
      }
      setCaseData(prev => ({ ...prev, testimonies: [...prev.testimonies, ...newTestimonies] }));
    } catch (error) {
      console.error("Error processing evidence:", error);
      alert("解析卷證失敗。");
    } finally {
      setIsLoading(false);
    }
  };

  const startAnalysis = async () => {
    if (caseData.testimonies.length === 0) {
      alert("請先上傳至少一份供述證據資訊。");
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await analyzeTestimony(
        caseData.indictment.facts,
        caseData.indictment.elements,
        caseData.testimonies
      );
      setCaseData(prev => ({ ...prev, analysis: result.analysis }));
      setActiveStep('analysis');
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startStrategy = async () => {
    setIsLoading(true);
    try {
      const result = await generateCrossExamination(caseData.analysis, caseData.testimonies);
      setCaseData(prev => ({ ...prev, questions: result }));
      setActiveStep('strategy');
    } catch (error) {
      console.error("Strategy error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeTestimony = (id: string) => {
    setCaseData(prev => ({
      ...prev,
      testimonies: prev.testimonies.filter(t => t.id !== id)
    }));
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-700 shadow-xl overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Scale className="text-blue-400 w-6 h-6" />
            禹河法律刑事案件系統
          </h1>
          <p className="text-[10px] mt-1 opacity-50 font-mono tracking-widest uppercase">Intelligent Case Analysis</p>
        </div>
        
        <nav className="flex-1 py-4">
          <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">案件作業階段</div>
          <SidebarNavItem 
            label="1. 匯入起訴書"
            icon={<FileText />} 
            active={activeStep === 'indictment'} 
            disabled={!caseData.indictment.facts && activeStep !== 'upload'}
            onClick={() => setActiveStep('indictment')}
          />
          <SidebarNavItem 
            label="2. 供述證據整理"
            icon={<Users />} 
            active={activeStep === 'evidence'} 
            disabled={!caseData.indictment.facts}
            onClick={() => setActiveStep('evidence')}
          />
          <SidebarNavItem 
            label="3. 構成要件詰問"
            icon={<BrainCircuit />} 
            active={activeStep === 'analysis'} 
            disabled={caseData.analysis.length === 0}
            onClick={() => setActiveStep('analysis')}
          />
          <SidebarNavItem 
            label="4. 策略彙報"
            icon={<MessageSquareQuote />} 
            active={activeStep === 'strategy'} 
            disabled={caseData.questions.length === 0}
            onClick={() => setActiveStep('strategy')}
          />
          
          <div className="mt-8 px-6">
            <button 
              onClick={() => exportCaseToWord(caseData)}
              disabled={caseData.analysis.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-white py-2.5 rounded-lg text-xs font-bold transition-all shadow-lg border border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              匯出 Word 報告
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="bg-slate-800/50 p-3 rounded-lg flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">處理狀態</p>
              <p className="text-xs text-white truncate">{activeStep === 'upload' ? '等待上傳' : '已匯入案卷'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm z-10 shrink-0">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-slate-900">
              {caseData.indictment.facts ? "113年偵字案：事實分析中" : "準備匯入新案卷"}
            </h2>
            <div className="flex items-center gap-4 mt-1">
              {caseData.indictment.laws.length > 0 ? (
                caseData.indictment.laws.slice(0, 2).map((law, i) => (
                  <span key={i} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold border border-blue-100">
                    {law}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-slate-400 italic">尚未定義適用法條</span>
              )}
              {caseData.indictment.facts && (
                <>
                  <span className="text-xs text-slate-300">|</span>
                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    電子卷證：{caseData.testimonies.length} 份
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-3">
             {activeStep !== 'upload' && (
               <button 
                 onClick={() => setActiveStep('upload')}
                 className="text-[10px] font-bold bg-white border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-lg shadow-sm transition-all text-slate-600 flex items-center gap-2"
               >
                 <ListRestart className="w-3.5 h-3.5" />
                 重新整理案件
               </button>
             )}
             <button className="text-[10px] font-bold bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-lg shadow-lg transition-all flex items-center gap-2">
                <BrainCircuit className="w-3.5 h-3.5" />
                智能法律點子
             </button>
          </div>
        </header>

        {/* Content Section */}
        <section className="flex-1 overflow-hidden relative flex flex-col">
          {isLoading && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-[100] flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <div className="text-center">
                  <p className="font-bold text-slate-800">正在分析法律要件...</p>
                  <p className="text-xs text-slate-500 mt-1">AI 正在從繁雜卷證中提取事實與矛盾</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 p-8 grid-scroll">
            <AnimatePresence mode="wait">
              {activeStep === 'upload' && (
                <motion.div 
                  key="upload"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-xl mx-auto mt-20"
                >
                  <div className="bg-white p-10 rounded-[32px] border border-slate-200 shadow-xl text-center">
                    <div className="flex justify-center mb-8">
                      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
                        <FileText className="w-8 h-8 text-blue-500" />
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold mb-3 text-slate-900">匯入刑事起訴書</h2>
                    <p className="text-slate-500 mb-10 text-sm leading-relaxed">上傳檢察官起訴書，系統將精準識別構成要件、<br/>事實爭點及適用法律條文。</p>
                    
                    <label className="flex flex-col items-center justify-center h-56 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-white hover:border-blue-400 transition-all cursor-pointer shadow-inner group">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-blue-500" />
                      </div>
                      <span className="text-slate-700 font-bold">點選或拖放檔案</span>
                      <span className="text-slate-400 text-[10px] mt-2 font-mono uppercase tracking-widest">Supports PDF, DOCX</span>
                      <input type="file" className="hidden" accept=".pdf,.docx,.doc" onChange={handleIndictmentUpload} />
                    </label>
                  </div>
                </motion.div>
              )}

              {activeStep === 'indictment' && (
                <motion.div 
                  key="indictment"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-8"
                >
                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-6 bg-blue-500 rounded-full" />
                        <h3 className="font-bold text-slate-900">犯罪事實認定</h3>
                      </div>
                      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-slate-700 leading-relaxed text-sm">
                        <ReactMarkdown>{caseData.indictment.facts}</ReactMarkdown>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 px-1">法律構成要件</h4>
                        <div className="space-y-3">
                          {caseData.indictment.elements.map((el, i) => (
                            <div key={i} className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm border-l-4 border-blue-400 group hover:border-blue-600 transition-all">
                              <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-[10px] shrink-0">
                                {i + 1}
                              </div>
                              {el}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end p-4">
                    <button 
                      onClick={() => setActiveStep('evidence')}
                      className="group bg-blue-600 text-white px-10 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                    >
                      匯入供述與筆錄
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              )}

              {activeStep === 'evidence' && (
                <motion.div 
                  key="evidence"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">供述卷證管理</h3>
                    </div>
                    <label className="bg-white border border-slate-200 text-slate-700 px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
                      <Upload className="w-3.5 h-3.5" />
                      加上傳卷證資訊
                      <input type="file" multiple className="hidden" onChange={handleEvidenceUpload} />
                    </label>
                  </div>

                  {caseData.testimonies.length === 0 ? (
                    <div className="bg-slate-50/50 border border-slate-200 rounded-3xl p-32 text-center">
                      <div className="inline-flex w-16 h-16 bg-white rounded-2xl shadow-sm items-center justify-center mb-6">
                        <Users className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-400 font-bold mb-2">尚未匯入電子卷證</p>
                      <p className="text-slate-300 text-xs">請點選上方按鈕或拖放檔案至此</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {caseData.testimonies.map((t) => (
                        <div key={t.id} className="testimony-card flex flex-col group relative">
                          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button 
                              onClick={() => removeTestimony(t.id)} 
                              className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                            <h4 className="font-bold text-slate-900 text-sm truncate">{t.name}</h4>
                            <span className="text-[10px] font-mono text-slate-400">PDF DOC</span>
                          </div>
                          <p className="text-slate-500 text-xs line-clamp-5 leading-relaxed italic pr-2">
                            「{t.content.length > 200 ? t.content.slice(0, 200) + '...' : t.content}」
                          </p>
                          <div className="mt-auto pt-6 flex items-center justify-between">
                             <div className="flex items-center gap-1.5">
                               <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                               <span className="text-[10px] font-bold text-blue-600 uppercase">就緒</span>
                             </div>
                             <span className="text-[10px] text-slate-300">卷碼: {Math.floor(Math.random() * 1000)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end pt-10">
                    <button 
                      onClick={startAnalysis}
                      disabled={caseData.testimonies.length === 0}
                      className="group bg-blue-600 text-white px-12 py-4 rounded-xl font-bold flex items-center gap-3 hover:bg-blue-700 transition-all shadow-2xl shadow-blue-100 disabled:opacity-50"
                    >
                      <BrainCircuit className="w-5 h-5" />
                      深度分析證據分佈
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              )}

              {activeStep === 'analysis' && (
                <motion.div 
                  key="analysis"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-10"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                         <Scale className="w-5 h-5" />
                       </div>
                       <h3 className="text-xl font-bold text-slate-900">證據對抗分析矩陣</h3>
                    </div>
                    <div className="flex gap-6 items-center px-6 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-green-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        有利
                      </div>
                      <div className="w-px h-4 bg-slate-200" />
                      <div className="flex items-center gap-2 text-[10px] font-bold text-red-600">
                        <AlertCircle className="w-3.5 h-3.5" />
                        不利
                      </div>
                    </div>
                  </div>

                  <div className="space-y-10">
                    {caseData.analysis.map((item, idx) => (
                      <div key={idx} className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                           <div className="flex items-center gap-4">
                             <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                             <h4 className="font-bold text-slate-900">{item.element}</h4>
                           </div>
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">構成要件分析</span>
                        </div>
                        <div className="grid md:grid-cols-2">
                          <div className="p-10 border-r border-slate-100 space-y-6">
                             <h5 className="flex items-center gap-2 text-green-700 text-xs font-bold uppercase tracking-widest mb-6">
                                有利被告供述
                             </h5>
                             <div className="space-y-5">
                                {item.favorable.map((s: string, i: number) => (
                                  <div key={i} className="flex gap-4 p-5 bg-green-50/30 rounded-2xl border border-green-100/50 group">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                    <p className="text-slate-700 text-sm leading-relaxed">{s}</p>
                                  </div>
                                ))}
                             </div>
                          </div>
                          <div className="p-10 bg-slate-50/20 space-y-6">
                             <h5 className="flex items-center gap-2 text-red-700 text-xs font-bold uppercase tracking-widest mb-6">
                                不利被告供述
                             </h5>
                             <div className="space-y-5">
                                {item.unfavorable.map((s: string, i: number) => (
                                  <div key={i} className="flex gap-4 p-5 bg-red-50/30 rounded-2xl border border-red-100/50">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                                    <p className="text-slate-700 text-sm leading-relaxed">{s}</p>
                                  </div>
                                ))}
                             </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end p-8 pb-16">
                    <button 
                      onClick={startStrategy}
                      className="group bg-blue-600 text-white px-12 py-4 rounded-xl font-bold flex items-center gap-3 hover:bg-blue-700 transition-all shadow-2xl shadow-blue-100"
                    >
                      <MessageSquareQuote className="w-5 h-5" />
                      設計詰問戰術
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              )}

              {activeStep === 'strategy' && (
                <motion.div 
                  key="strategy"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-12 pb-24"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                         <MessageSquareQuote className="w-5 h-5" />
                       </div>
                       <h3 className="text-xl font-bold text-slate-900">交互詰問戰術規劃</h3>
                    </div>
                    <button 
                      onClick={() => exportCaseToWord(caseData)}
                      className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      下載完整 Word 報告
                    </button>
                  </div>

                  <div className="space-y-16">
                    {caseData.questions.map((w, i) => (
                      <div key={i} className="space-y-8 animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-[20px] bg-slate-50 border border-slate-200 flex items-center justify-center shadow-sm">
                               <Users className="w-6 h-6 text-slate-400" />
                            </div>
                            <div>
                               <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-0.5">主詰問證人</p>
                               <h4 className="text-2xl font-bold text-slate-900">{w.witness}</h4>
                            </div>
                          </div>
                          <div className="px-6 py-2 bg-indigo-50 border border-indigo-100/50 rounded-2xl flex items-center gap-3">
                             <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">目標:</span>
                             <span className="text-sm font-medium text-slate-800">{w.goal}</span>
                          </div>
                        </div>

                        <div className="grid gap-6">
                          {w.questions.map((q: any, qi: number) => (
                            <div key={qi} className="group bg-white p-10 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                              {/* Strategy bar indicator */}
                              <div className="absolute left-0 top-0 bottom-0 w-2 bg-blue-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                              
                              <div className="flex gap-8">
                                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-300">
                                  {qi + 1}
                                </div>
                                <div className="flex-grow space-y-6">
                                  <div className="space-y-2">
                                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">詰問題目</p>
                                     <p className="text-xl font-bold leading-relaxed text-slate-900 pr-10">
                                        {q.question}
                                     </p>
                                  </div>
                                  <div className="grid md:grid-cols-2 gap-12 pt-6 border-t border-slate-50">
                                     <div>
                                        <h6 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">預期應答分析</h6>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600 italic">
                                          「{q.expectedAnswer}」
                                        </div>
                                     </div>
                                     <div>
                                        <h6 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">戰術目的</h6>
                                        <p className="text-sm text-slate-600 leading-relaxed font-medium">{q.strategy}</p>
                                     </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
}

function SidebarNavItem({ icon, label, active, disabled, onClick }: { 
  icon: React.ReactNode, 
  label: string,
  active?: boolean, 
  disabled?: boolean,
  onClick?: () => void 
}) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "sidebar-link w-full text-left flex items-center gap-4",
        active ? "sidebar-link-active text-white" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-10"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
        active ? "bg-blue-600" : "bg-slate-800"
      )}>
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: "w-4 h-4" }) : icon}
      </div>
      <span className="font-bold tracking-tight text-xs">{label}</span>
    </button>
  );
}

