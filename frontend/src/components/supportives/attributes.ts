export interface FormField {
  name: string;
  label: string;
  type: "text" | "textarea" | "file" | "select";
  options?: string[];
}

export const FORM_FIELDS: FormField[] = [
  { name: "sound_id", label: "Sound ID", type: "text" },
  { name: "contributor", label: "Contributor", type: "text" },
  { name: "title", label: "Title", type: "text" },
  { name: "category", label: "Category", type: "text" },
  {
    name: "country",
    label: "Country",
    type: "select",
    options: ["Ethiopia", "Kenya", "Uganda"],
  },
  { name: "community", label: "Community", type: "text" },
  { name: "region", label: "Region", type: "text" },
  { name: "context", label: "Context", type: "text" },
  { name: "performer", label: "Performer", type: "text" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "sound_track_url", label: "Sound Track", type: "file" },
  { name: "album_file_url", label: "Album File", type: "file" },
];
