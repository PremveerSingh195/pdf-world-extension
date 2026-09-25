import { jsPDF } from 'jspdf';

export interface ResumeData {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  experience: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  education: Array<{
    school: string;
    degree: string;
    year: string;
  }>;
  projects?: Array<{
    name: string;
    description: string;
    link?: string;
  }>;
}

export const resumeService = {
  async generateResumePdf(data: ResumeData): Promise<Uint8Array> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;

    // Header with accent top bar
    pdf.setFillColor(239, 68, 68); // Brand Red
    pdf.rect(0, 0, pageWidth, 6, 'F');

    // Name
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(15, 23, 42);
    pdf.text(data.fullName || 'Your Name', margin, 50);

    // Job Title
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(13);
    pdf.setTextColor(239, 68, 68);
    pdf.text(data.jobTitle || 'Professional Title', margin, 68);

    // Contact info bar
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    const contactParts = [data.email, data.phone, data.location].filter(Boolean);
    pdf.text(contactParts.join('  •  '), margin, 84);

    // Divider line
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, 95, pageWidth - margin, 95);

    let curY = 115;

    const checkPageBreak = (neededHeight: number) => {
      if (curY + neededHeight > pageHeight - margin) {
        pdf.addPage();
        curY = margin + 10;
      }
    };

    // Professional Summary
    if (data.summary) {
      checkPageBreak(50);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text('PROFESSIONAL SUMMARY', margin, curY);

      curY += 14;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.5);
      pdf.setTextColor(51, 65, 85);
      const summaryLines = pdf.splitTextToSize(data.summary, contentWidth);
      pdf.text(summaryLines, margin, curY);
      curY += summaryLines.length * 13 + 15;
    }

    // Work Experience
    if (data.experience && data.experience.length > 0) {
      checkPageBreak(40);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text('WORK EXPERIENCE', margin, curY);
      curY += 16;

      for (const exp of data.experience) {
        checkPageBreak(50);
        // Position & Dates
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(15, 23, 42);
        pdf.text(exp.position || 'Role', margin, curY);

        const dateRange = `${exp.startDate || ''} - ${exp.endDate || 'Present'}`;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);
        const dateWidth = pdf.getTextWidth(dateRange);
        pdf.text(dateRange, pageWidth - margin - dateWidth, curY);

        curY += 13;
        // Company
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(71, 85, 105);
        pdf.text(exp.company || 'Company', margin, curY);

        curY += 13;
        // Description
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(51, 65, 85);
        const descLines = pdf.splitTextToSize(exp.description, contentWidth);
        pdf.text(descLines, margin, curY);
        curY += descLines.length * 12 + 14;
      }
    }

    // Education
    if (data.education && data.education.length > 0) {
      checkPageBreak(40);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text('EDUCATION', margin, curY);
      curY += 16;

      for (const edu of data.education) {
        checkPageBreak(30);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(15, 23, 42);
        pdf.text(edu.degree || 'Degree', margin, curY);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);
        const yr = edu.year || '';
        const yrW = pdf.getTextWidth(yr);
        pdf.text(yr, pageWidth - margin - yrW, curY);

        curY += 13;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(71, 85, 105);
        pdf.text(edu.school || 'School', margin, curY);
        curY += 16;
      }
    }

    // Skills
    if (data.skills && data.skills.length > 0) {
      checkPageBreak(40);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text('KEY SKILLS', margin, curY);
      curY += 15;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(51, 65, 85);
      const skillsStr = data.skills.join('  •  ');
      const skillLines = pdf.splitTextToSize(skillsStr, contentWidth);
      pdf.text(skillLines, margin, curY);
    }

    return new Uint8Array(pdf.output('arraybuffer'));
  },
};
