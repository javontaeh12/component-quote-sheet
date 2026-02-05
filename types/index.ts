export type UserRole = 'admin' | 'manager' | 'tech';
export type UserStatus = 'pending' | 'approved' | 'rejected';
export type OrderStatus = 'pending' | 'ordered' | 'received';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  status: UserStatus;
  van_id: string | null;
  created_at: string;
}

export interface Van {
  id: string;
  name: string;
  license_plate: string | null;
  assigned_tech_id: string | null;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  van_id: string;
  name: string;
  description: string | null;
  part_number: string | null;
  quantity: number;
  min_quantity: number;
  cost: number | null;
  vendor: string | null;
  category: string | null;
  updated_at: string;
  created_at: string;
}

export interface OrderItem {
  item_id: string;
  name: string;
  part_number: string | null;
  quantity_needed: number;
  vendor: string | null;
  cost: number | null;
}

export interface Order {
  id: string;
  created_by: string | null;
  items: OrderItem[];
  status: OrderStatus;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CustomPart {
  id: string;
  item: string;
  description: string;
  category: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DocumentGroup {
  id: string;
  group_id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  group_id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'> & { created_at?: string };
        Update: Partial<Profile>;
      };
      vans: {
        Row: Van;
        Insert: Omit<Van, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Van>;
      };
      inventory_items: {
        Row: InventoryItem;
        Insert: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<InventoryItem>;
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Order>;
      };
    };
  };
}
