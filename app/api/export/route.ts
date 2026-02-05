import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

interface ExportItem {
  name: string;
  part_number: string | null;
  quantity: number;
  quantity_needed: number;
  vendor: string | null;
  cost: number | null;
  van_name: string;
}

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json() as { items: ExportItem[] };

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();

    const worksheetData = [
      ['Low Stock Order - ' + new Date().toLocaleDateString()],
      [],
      ['Item', 'Part Number', 'Current Qty', 'Qty Needed', 'Vendor', 'Unit Cost', 'Est. Total', 'Van'],
      ...items.map((item) => [
        item.name,
        item.part_number || '',
        item.quantity,
        item.quantity_needed,
        item.vendor || '',
        item.cost ? `$${item.cost.toFixed(2)}` : '',
        item.cost ? `$${(item.cost * item.quantity_needed).toFixed(2)}` : '',
        item.van_name,
      ]),
      [],
      [
        '',
        '',
        '',
        items.reduce((sum, i) => sum + i.quantity_needed, 0),
        '',
        '',
        `$${items.reduce((sum, i) => sum + (i.cost || 0) * i.quantity_needed, 0).toFixed(2)}`,
        '',
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 30 }, // Item
      { wch: 15 }, // Part Number
      { wch: 12 }, // Current Qty
      { wch: 12 }, // Qty Needed
      { wch: 20 }, // Vendor
      { wch: 12 }, // Unit Cost
      { wch: 12 }, // Est. Total
      { wch: 15 }, // Van
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Low Stock Order');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="low-stock-order-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}
