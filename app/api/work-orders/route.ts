import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const group_id = searchParams.get('group_id');
    const status = searchParams.get('status');
    const tech_id = searchParams.get('tech_id');

    let query = supabase
      .from('work_orders')
      .select('*, customers(full_name, phone, address), profiles:assigned_tech_id(full_name)')
      .order('created_at', { ascending: false });

    if (group_id) query = query.eq('group_id', group_id);
    if (status) query = query.eq('status', status);
    if (tech_id) query = query.eq('assigned_tech_id', tech_id);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Work orders GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch work orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('work_orders')
      .insert(body)
      .select('*, customers(full_name, phone, address), profiles:assigned_tech_id(full_name)')
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Work orders POST error:', error);
    return NextResponse.json({ error: 'Failed to create work order' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { id, ...updates } = body;

    // If completing, also deduct parts from inventory
    if (updates.status === 'completed' && updates.parts_used?.length) {
      for (const part of updates.parts_used) {
        if (part.inventory_item_id) {
          await supabase.rpc('decrement_inventory', {
            item_id: part.inventory_item_id,
            qty: part.quantity,
          });
        }
      }
      updates.completed_at = new Date().toISOString();
    }

    if (updates.status === 'in_progress' && !updates.started_at) {
      updates.started_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('work_orders')
      .update(updates)
      .eq('id', id)
      .select('*, customers(full_name, phone, address), profiles:assigned_tech_id(full_name)')
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Work orders PUT error:', error);
    return NextResponse.json({ error: 'Failed to update work order' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const { error } = await supabase.from('work_orders').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Work orders DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete work order' }, { status: 500 });
  }
}
