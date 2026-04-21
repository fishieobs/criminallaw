import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { saveAs } from "file-saver";

export async function exportCaseToWord(caseData: any) {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "刑事案件智慧詰問整理報告",
            heading: HeadingLevel.TITLE,
            alignment: "center",
          }),
          
          new Paragraph({ text: "", spacing: { before: 200, after: 200 } }),
          
          new Paragraph({
            text: "一、 起訴書摘要",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "犯罪事實：", bold: true }),
              new TextRun(caseData.indictment.facts),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "適用法條：", bold: true }),
              new TextRun(caseData.indictment.laws.join(", ")),
            ],
          }),

          new Paragraph({ text: "", spacing: { before: 200, after: 200 } }),

          new Paragraph({
            children: [new TextRun({ text: "二、 構成要件供述分析", bold: true, size: 28 })],
            heading: HeadingLevel.HEADING_1,
          }),
          
          ...caseData.analysis.flatMap((item: any) => [
            new Paragraph({
              children: [new TextRun({ text: `構成要件：${item.element}`, bold: true, size: 24 })],
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              children: [new TextRun({ text: "有利被告之供述：", bold: true })],
            }),
            ...item.favorable.map((s: string) => new Paragraph({ text: `• ${s}`, bullet: { level: 0 } })),
            new Paragraph({
              children: [new TextRun({ text: "不利被告之供述：", bold: true })],
            }),
            ...item.unfavorable.map((s: string) => new Paragraph({ text: `• ${s}`, bullet: { level: 0 } })),
          ]),

          new Paragraph({ text: "", spacing: { before: 200, after: 200 } }),

          new Paragraph({
            children: [new TextRun({ text: "三、 交互詰問設計", bold: true, size: 28 })],
            heading: HeadingLevel.HEADING_1,
          }),
          
          ...caseData.questions.flatMap((witness: any) => [
            new Paragraph({
              children: [new TextRun({ text: `證人：${witness.witness}`, bold: true, size: 24 })],
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              children: [new TextRun({ text: `詰問目標：${witness.goal}`, italics: true })],
            }),
            ...witness.questions.map((q: any, i: number) => new Paragraph({
              children: [
                new TextRun({ text: `Q${i + 1}: ${q.question}`, bold: true }),
                new TextRun({ text: `\n策略：${q.strategy}`, size: 20 }),
              ],
            })),
          ]),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "刑事詰問整理報告.docx");
}
