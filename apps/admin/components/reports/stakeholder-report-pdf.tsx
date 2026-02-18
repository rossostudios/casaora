"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type StakeholderKpis = {
  income: number;
  expenses: number;
  netPayout: number;
  occupancyRatePct: number;
  collectionRatePct: number;
  slaBreaches: number;
  overdueTasks: number;
};

type StakeholderException = {
  title: string;
  detail: string;
};

type StakeholderPropertyRow = {
  property_name: string;
  income: number;
  expenses: number;
  net_payout: number;
  occupancy_rate: number;
  outstanding_count: number;
  outstanding_amount: number;
};

type StakeholderTrendRow = {
  month: string;
  income: number;
  expenses: number;
  netPayout: number;
  collectionRatePct: number;
};

type StakeholderReportPdfProps = {
  isEn: boolean;
  locale: string;
  orgName: string;
  periodLabel: string;
  propertyLabel: string;
  kpis: StakeholderKpis;
  exceptions: StakeholderException[];
  propertyRows: StakeholderPropertyRow[];
  trendRows: StakeholderTrendRow[];
};

function fmtCurrency(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "PYG",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function sanitizeFilePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function StakeholderReportPdfButton({
  isEn,
  locale,
  orgName,
  periodLabel,
  propertyLabel,
  kpis,
  exceptions,
  propertyRows,
  trendRows,
}: StakeholderReportPdfProps) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    if (generating) return;
    setGenerating(true);

    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const margin = 14;
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 16;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.text(
        isEn ? "Stakeholder Report" : "Reporte para stakeholders",
        margin,
        y
      );
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(orgName, margin, y);
      y += 5;
      doc.text(periodLabel, margin, y);
      y += 5;
      doc.text(
        `${isEn ? "Property" : "Propiedad"}: ${propertyLabel}`,
        margin,
        y
      );
      y += 4;

      doc.setDrawColor(210);
      doc.line(margin, y, pageWidth - margin, y);
      y += 7;

      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(isEn ? "KPI Summary" : "Resumen KPI", margin, y);
      y += 3;

      autoTable(doc, {
        startY: y,
        head: [[isEn ? "Metric" : "Métrica", isEn ? "Value" : "Valor"]],
        body: [
          [isEn ? "Income" : "Ingresos", fmtCurrency(kpis.income, locale)],
          [isEn ? "Expenses" : "Gastos", fmtCurrency(kpis.expenses, locale)],
          [isEn ? "Net payout" : "Liquidación neta", fmtCurrency(kpis.netPayout, locale)],
          [isEn ? "Occupancy" : "Ocupación", fmtPercent(kpis.occupancyRatePct)],
          [isEn ? "Collection rate" : "Tasa de cobro", fmtPercent(kpis.collectionRatePct)],
          [isEn ? "SLA breaches" : "Incumplimientos SLA", String(kpis.slaBreaches)],
          [isEn ? "Overdue tasks" : "Tareas vencidas", String(kpis.overdueTasks)],
        ],
        theme: "striped",
        headStyles: { fillColor: [31, 41, 55], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 1: { halign: "right" } },
        margin: { left: margin, right: margin },
      });

      // @ts-expect-error - provided by jspdf-autotable
      y = doc.lastAutoTable.finalY + 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(isEn ? "Trends Snapshot" : "Snapshot de tendencias", margin, y);
      y += 3;

      if (trendRows.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [
            [
              isEn ? "Month" : "Mes",
              isEn ? "Income" : "Ingresos",
              isEn ? "Expenses" : "Gastos",
              isEn ? "Net payout" : "Liquidación neta",
              isEn ? "Collection rate" : "Tasa de cobro",
            ],
          ],
          body: trendRows.map((row) => [
            row.month,
            fmtCurrency(row.income, locale),
            fmtCurrency(row.expenses, locale),
            fmtCurrency(row.netPayout, locale),
            fmtPercent(row.collectionRatePct),
          ]),
          theme: "striped",
          headStyles: { fillColor: [55, 65, 81], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            1: { halign: "right" },
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
          },
          margin: { left: margin, right: margin },
        });
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(
          isEn
            ? "No trend data available for this selection."
            : "No hay datos de tendencia para este filtro.",
          margin,
          y + 5
        );
      }

      // @ts-expect-error - provided by jspdf-autotable
      y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 8 : y + 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(isEn ? "Exceptions" : "Excepciones", margin, y);
      y += 3;

      if (exceptions.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [[isEn ? "Attention required" : "Atención requerida", isEn ? "Detail" : "Detalle"]],
          body: exceptions.map((row) => [row.title, row.detail]),
          theme: "striped",
          headStyles: { fillColor: [180, 83, 9], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: margin, right: margin },
        });
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(
          isEn
            ? "No critical exceptions detected."
            : "No se detectaron excepciones críticas.",
          margin,
          y + 5
        );
      }

      // @ts-expect-error - provided by jspdf-autotable
      y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 8 : y + 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(
        isEn ? "Property Summary" : "Resumen por propiedad",
        margin,
        y
      );
      y += 3;

      if (propertyRows.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [
            [
              isEn ? "Property" : "Propiedad",
              isEn ? "Income" : "Ingresos",
              isEn ? "Expenses" : "Gastos",
              isEn ? "Net payout" : "Liquidación neta",
              isEn ? "Occupancy" : "Ocupación",
              isEn ? "Outstanding" : "Pendientes",
            ],
          ],
          body: propertyRows.map((row) => [
            row.property_name,
            fmtCurrency(row.income, locale),
            fmtCurrency(row.expenses, locale),
            fmtCurrency(row.net_payout, locale),
            fmtPercent(row.occupancy_rate * 100),
            `${row.outstanding_count} · ${fmtCurrency(row.outstanding_amount, locale)}`,
          ]),
          theme: "striped",
          headStyles: { fillColor: [17, 24, 39], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: margin, right: margin },
          columnStyles: {
            1: { halign: "right" },
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
            5: { halign: "right" },
          },
        });
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(
          isEn
            ? "No property rows available for this filter."
            : "No hay filas por propiedad para este filtro.",
          margin,
          y + 5
        );
      }

      const totalPages = doc.getNumberOfPages();
      const generatedOn = new Date().toLocaleDateString(locale);
      for (let i = 1; i <= totalPages; i += 1) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(130);
        const footerY = doc.internal.pageSize.getHeight() - 8;
        doc.text(
          `${isEn ? "Generated by" : "Generado por"} Casaora · ${generatedOn}`,
          margin,
          footerY
        );
        doc.text(
          `${isEn ? "Page" : "Página"} ${i}/${totalPages}`,
          pageWidth - margin,
          footerY,
          { align: "right" }
        );
      }

      const fileName = `${isEn ? "stakeholder-report" : "reporte-stakeholders"}-${sanitizeFilePart(periodLabel) || "period"}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Stakeholder PDF generation failed:", error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button disabled={generating} onClick={handleDownload} size="sm" variant="outline">
      {generating ? (
        <>
          <Spinner size="sm" />
          {isEn ? "Generating PDF..." : "Generando PDF..."}
        </>
      ) : isEn ? (
        "Export PDF"
      ) : (
        "Exportar PDF"
      )}
    </Button>
  );
}
