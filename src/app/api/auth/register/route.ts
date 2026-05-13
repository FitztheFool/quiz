// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/mail';
import { checkRateLimit, getIp } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const { allowed, retryAfter } = checkRateLimit(`register:${getIp(req)}`, 5, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  try {
    const { username, email, password } = await req.json();

    // Validations
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      );
    }

    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json(
        { error: 'Email invalide' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]{2,32}$/.test(username)) {
      return NextResponse.json(
        { error: 'Nom d\'utilisateur invalide (2-32 caractères, lettres/chiffres/underscore uniquement)' },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      // Message générique pour ne pas révéler quel email/pseudo est déjà enregistré.
      return NextResponse.json(
        { error: 'Email ou nom d\'utilisateur déjà utilisé' },
        { status: 400 }
      );
    }

    // Hasher le mot de passe
    const passwordHash = await hash(password, 10);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    // Créer le token de vérification et envoyer l'email
    const token = randomBytes(32).toString('hex');
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    await sendVerificationEmail(email, token).catch(err =>
      console.error('Erreur envoi email de vérification:', err)
    );

    return NextResponse.json(
      {
        message: 'Compte créé avec succès. Vérifiez votre email pour activer votre compte.',
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erreur lors de la création du compte:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
