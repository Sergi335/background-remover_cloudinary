import type { APIRoute } from 'astro';
import { v2 as cloudinary } from 'cloudinary';

// Check if environment variables are set
const cloudName = import.meta.env.CLOUDINARY_CLOUD_NAME;
const apiKey = import.meta.env.CLOUDINARY_API_KEY;
const apiSecret = import.meta.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error('Missing Cloudinary credentials. Please check your .env file and ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set.');
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    
    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }), 
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Validate file size
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (image.size > maxSize) {
      return new Response(
        JSON.stringify({ error: 'File size must be less than 5MB' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(image.type)) {
      return new Response(
        JSON.stringify({ error: 'Only JPG, JPEG, and PNG files are allowed' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    try {
      // Convert File to base64
      const buffer = await image.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString('base64');
      const dataURI = `data:${image.type};base64,${base64Image}`;

      // Test Cloudinary connection first
      const testUpload = await cloudinary.uploader.upload('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', {
        folder: 'test'
      });

      // If test succeeds, proceed with actual upload
      const uploadResponse = await cloudinary.uploader.upload(dataURI, {
        background_removal: true
      });

      return new Response(
        JSON.stringify({
          url: uploadResponse.secure_url
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (cloudinaryError) {
      console.error('Cloudinary Error:', cloudinaryError);
      return new Response(
        JSON.stringify({
          error: cloudinaryError instanceof Error 
            ? `Cloudinary Error: ${cloudinaryError.message}`
            : 'Failed to upload to Cloudinary. Please verify your credentials.'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
  } catch (error) {
    console.error('General Error:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error 
          ? `Error: ${error.message}`
          : 'An unexpected error occurred. Please try again.'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
};