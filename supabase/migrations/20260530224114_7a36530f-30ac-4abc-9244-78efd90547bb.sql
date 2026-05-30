-- Create a table for sheets
CREATE TABLE public.sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sheets TO authenticated;
GRANT ALL ON public.sheets TO service_role;

-- Enable RLS
ALTER TABLE public.sheets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own sheets"
ON public.sheets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sheets"
ON public.sheets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sheets"
ON public.sheets
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_sheets_updated_at
BEFORE UPDATE ON public.sheets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
