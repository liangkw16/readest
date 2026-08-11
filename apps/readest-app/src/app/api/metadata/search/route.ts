import { NextRequest, NextResponse } from 'next/server';
import { MetadataService } from '@/services/metadata/service';
import { SearchRequest } from '@/services/metadata/types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  responseTime?: number;
}

function validateSearchRequest(body: SearchRequest): {
  isValid: boolean;
  error?: string;
  data?: SearchRequest;
} {
  const { title, isbn, author, language } = body;

  if (
    (!title || typeof title !== 'string' || title.trim().length === 0) &&
    (!isbn || typeof isbn !== 'string' || isbn.trim().length === 0)
  ) {
    return {
      isValid: false,
      error: 'Either title or isbn parameter is required and must be a non-empty string',
    };
  }

  if (title && typeof title !== 'string') {
    return { isValid: false, error: 'Title must be a string if provided' };
  }

  if (isbn && typeof isbn !== 'string') {
    return { isValid: false, error: 'ISBN must be a string if provided' };
  }

  if (author && typeof author !== 'string') {
    return { isValid: false, error: 'Author must be a string if provided' };
  }

  if (isbn) {
    const cleanIsbn = isbn.replace(/[-\s]/g, '');
    if (!/^\d{10}(\d{3})?$/.test(cleanIsbn)) {
      return { isValid: false, error: 'Invalid ISBN format. Must be 10 or 13 digits' };
    }
  }

  return {
    isValid: true,
    data: {
      title: title?.trim(),
      isbn: isbn?.trim(),
      author: author?.trim(),
      language: language?.trim(),
    },
  };
}

function createResponse<T>(
  success: boolean,
  data: T | null = null,
  error: string | null = null,
  responseTime: number,
): ApiResponse<T> {
  return {
    success,
    data: data || undefined,
    error: error || undefined,
    timestamp: new Date().toISOString(),
    responseTime,
  };
}

let metadataService: MetadataService;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 60;
const MAX_CONCURRENT_REQUESTS = 3;
const requestBudgets = new Map<string, { count: number; resetAt: number; active: number }>();

function getMetadataService(): MetadataService {
  if (!metadataService) {
    metadataService = new MetadataService({
      googleBooksApiKeys: process.env['GOOGLE_BOOKS_API_KEYS'],
    });
  }
  return metadataService;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  try {
    if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = Date.now();
  const clientId =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('user-agent') ||
    'local';
  let budget = requestBudgets.get(clientId);
  if (!budget) {
    budget = {
      count: 0,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
      active: 0,
    };
    requestBudgets.set(clientId, budget);
  } else if (budget.resetAt <= now) {
    budget.count = 0;
    budget.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  if (budget.count >= RATE_LIMIT_REQUESTS || budget.active >= MAX_CONCURRENT_REQUESTS) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((budget.resetAt - now) / 1000)) } },
    );
  }
  budget.count++;
  budget.active++;

  const startTime = Date.now();

  try {
    const body = await request.json();
    const validation = validateSearchRequest(body);
    if (!validation.isValid) {
      const responseTime = Date.now() - startTime;
      return NextResponse.json(createResponse(false, null, validation.error!, responseTime), {
        status: 400,
      });
    }

    const service = getMetadataService();
    const result = await service.search(validation.data!);
    const responseTime = Date.now() - startTime;

    if (!result) {
      return NextResponse.json(createResponse(false, null, 'Book not found', responseTime), {
        status: 404,
      });
    }

    return NextResponse.json(createResponse(true, result, null, responseTime), {
      status: 200,
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Search API error:', error);

    let errorMessage = 'Internal server error';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      if (error.message.includes('rate limit')) {
        statusCode = 429;
      } else if (error.message.includes('forbidden') || error.message.includes('API key')) {
        statusCode = 403;
      } else if (error.message.includes('Invalid ISBN')) {
        statusCode = 400;
      }
    }

    return NextResponse.json(createResponse(false, null, errorMessage, responseTime), {
      status: statusCode,
    });
  } finally {
    budget.active--;
  }
}
