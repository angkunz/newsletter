import { createClient } from '@supabase/supabase-js';
import imageCompression from 'browser-image-compression';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials. Please check your .env file.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export const api = {
  // Newsletters
  getAll: async () => {
    const { data, error } = await supabase.from('newsletters').select('*').order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },
  
  getOne: async (id) => {
    const { data, error } = await supabase.from('newsletters').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    return data;
  },
  
  create: async (data = {}) => {
    const { data: newDoc, error } = await supabase.from('newsletters')
      .insert([{ title: data.title || 'วารสารใหม่', template: data.template || 'classic' }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return newDoc;
  },
  
  update: async (id, data) => {
    data.updated_at = new Date().toISOString();
    const { data: updatedDoc, error } = await supabase.from('newsletters')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return updatedDoc;
  },
  
  delete: async (id) => {
    const { error } = await supabase.from('newsletters').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  },
  
  duplicate: async (id) => {
    const { data: original, error: fetchError } = await supabase.from('newsletters').select('*').eq('id', id).single();
    if (fetchError) throw new Error(fetchError.message);
    
    delete original.id;
    original.title = original.title + ' (สำเนา)';
    original.created_at = new Date().toISOString();
    original.updated_at = new Date().toISOString();

    const { data: copy, error: insertError } = await supabase.from('newsletters')
      .insert([original])
      .select()
      .single();
    if (insertError) throw new Error(insertError.message);
    return copy;
  },

  // Uploads
  uploadBackground: async (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const filename = `backgrounds/background_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    
    const { error } = await supabase.storage.from('uploads').upload(filename, file);
    if (error) throw new Error(error.message);
    
    const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filename);
    return { url: publicUrlData.publicUrl };
  },
  
  uploadPhoto: async (files) => {
    const urls = [];
    for (const file of files) {
      const options = {
        maxSizeMB: 1, 
        maxWidthOrHeight: 1600,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);
      
      const filename = `photos/photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error } = await supabase.storage.from('uploads').upload(filename, compressedFile, { contentType: 'image/jpeg' });
      if (error) throw new Error(error.message);
      
      const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filename);
      urls.push(publicUrlData.publicUrl);
    }
    return { urls };
  },
  
  uploadLogo: async (file) => {
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 400,
      useWebWorker: true,
      fileType: 'image/png'
    };
    const compressedFile = await imageCompression(file, options);
    const filename = `logos/logo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
    
    const { error } = await supabase.storage.from('uploads').upload(filename, compressedFile, { contentType: 'image/png' });
    if (error) throw new Error(error.message);
    
    const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filename);
    return { url: publicUrlData.publicUrl };
  }
};
