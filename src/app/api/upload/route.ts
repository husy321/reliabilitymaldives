import { NextRequest } from 'next/server';
import { uploadDocumentAction } from '@/lib/actions/documents';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const result = await uploadDocumentAction(formData);
    
    return Response.json(result);
  } catch (error) {
    console.error('Upload API error:', error);
    return Response.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      },
      { status: 500 }
    );
  }
}