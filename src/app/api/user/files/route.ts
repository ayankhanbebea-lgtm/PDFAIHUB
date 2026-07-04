// src/app/api/user/files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { deleteFromCloudinary } from '@/lib/cloudinary';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const tool = searchParams.get('tool');

  const where: any = {
    userId: session.user.id,
    deletedAt: null,
  };
  if (tool) where.tool = tool;

  const [files, total] = await Promise.all([
    prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        originalName: true,
        size: true,
        tool: true,
        status: true,
        resultUrl: true,
        resultSize: true,
        createdAt: true,
      },
    }),
    prisma.file.count({ where }),
  ]);

  return NextResponse.json({ files, total, page, totalPages: Math.ceil(total / limit) });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { fileId } = await request.json();
    const file = await prisma.file.findUnique({
      where: { id: fileId, userId: session.user.id },
    });

    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    // Delete from Cloudinary
    if (file.publicId) {
      await deleteFromCloudinary(file.publicId).catch(console.error);
    }

    await prisma.file.update({
      where: { id: fileId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
