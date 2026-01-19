export interface Track {
  sound_id: string;       
  title: string;
  category: string;
  country: string;
  community: string;
  region: string;
  context: string;
  performer: string;
  description: string;
  isapproved:string;
  is_modern?: boolean;
  sound_track_url?: string; 
  album_file_url?: string;  
  modernaudio_url?: string;
  contributor?: string;
  rhythm_style?: string;
  harmony_type?: string;
  bpm?: string | number;
  mood?: string;
}
