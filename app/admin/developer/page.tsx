'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Code, Key, Globe, Copy, Check, ExternalLink } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: typeof Code;
  status: 'connected' | 'disconnected';
  details?: string;
}

const integrations: Integration[] = [
  {
    id: 'google-oauth',
    name: 'Google OAuth',
    description: 'Authentication provider for user sign-in',
    icon: Globe,
    status: 'connected',
    details: 'Configured via Supabase Auth',
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Database, auth, and storage backend',
    icon: Key,
    status: 'connected',
    details: 'Project: PrintWebsite',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'AI-powered helper for technicians',
    icon: Code,
    status: 'connected',
    details: 'Used by AI Helper feature',
  },
  {
    id: 'gmail',
    name: 'Gmail SMTP',
    description: 'Email notifications for admin alerts',
    icon: Globe,
    status: 'connected',
    details: 'Via Nodemailer with App Password',
  },
];

export default function DeveloperPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const envVars = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', masked: true },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', masked: true },
    { key: 'OPENAI_API_KEY', masked: true },
    { key: 'GMAIL_APP_PASSWORD', masked: true },
    { key: 'ADMIN_EMAIL', masked: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Developer Integrations</h1>
        <p className="text-gray-600 mt-1">Manage API integrations and service connections</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <Card key={integration.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <integration.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                    <p className="text-sm text-gray-500">{integration.description}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    integration.status === 'connected'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {integration.status === 'connected' ? 'Connected' : 'Not configured'}
                </span>
              </div>
              {integration.details && (
                <p className="text-xs text-gray-400 mt-3">{integration.details}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {envVars.map((envVar) => (
              <div
                key={envVar.key}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <code className="text-sm font-mono text-gray-700">{envVar.key}</code>
                <span className="text-sm text-gray-400 font-mono">{'••••••••'}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Environment variables are configured in <code className="bg-gray-100 px-1 py-0.5 rounded">.env.local</code> and cannot be viewed here for security.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-700"
            >
              <ExternalLink className="w-4 h-4" />
              Supabase Dashboard
            </a>
            <a
              href="https://console.cloud.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-700"
            >
              <ExternalLink className="w-4 h-4" />
              Google Cloud Console
            </a>
            <a
              href="https://platform.openai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-700"
            >
              <ExternalLink className="w-4 h-4" />
              OpenAI Platform
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
