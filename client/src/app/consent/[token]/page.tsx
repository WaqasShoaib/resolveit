'use client';

import React, { use, useEffect, useState } from 'react';
import { Button, Card, Typography, Space, Result, Spin, message } from 'antd';

const { Title, Paragraph, Text } = Typography;

async function getConsent(token: string) {
  const base = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000').replace(/\/+$/, '');
  const res = await fetch(`${base}/api/public/consent/${encodeURIComponent(token)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function postConsent(token: string, action: 'accept' | 'decline') {
  const base = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000').replace(/\/+$/, '');
  const res = await fetch(`${base}/api/public/consent/${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// 👇 note the type: params is a Promise in client components
export default function ConsentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params); // ✅ unwrap the Promise

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<any>(null);
  const [done, setDone] = useState<{ ok: boolean; msg?: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getConsent(token);
        setInfo(data.data);
      } catch {
        setDone({ ok: false, msg: 'Invalid or expired link.' });
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) return <div style={{ display: 'grid', placeItems: 'center', minHeight: 300 }}><Spin /></div>;
  if (done && !done.ok) return <Result status="error" title="Link Issue" subTitle={done.msg || 'Please contact support.'} />;
  if (!info) return <Result status="error" title="Not Found" />;

  const submit = async (action: 'accept' | 'decline') => {
    try {
      const resp = await postConsent(token, action);
      setDone({ ok: true, msg: resp.message });
      message.success(resp.message || 'Response recorded');
    } catch {
      message.error('Could not record response.');
    }
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
      <Card style={{ maxWidth: 720, width: '100%' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Title level={3}>ResolveIt Mediation Consent</Title>
          <Paragraph>
            You’ve been invited to participate in a mediation process on ResolveIt.
            Please review the case summary and choose whether to proceed.
          </Paragraph>
          <div style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}>
            <Text strong>Case Number:</Text> <Text>{info.caseNumber}</Text><br />
            <Text strong>Case Type:</Text> <Text>{info.caseType}</Text><br />
            {info.description && (
              <>
                <Text strong>Description:</Text>
                <Paragraph style={{ marginTop: 8 }}>{info.description}</Paragraph>
              </>
            )}
          </div>
          <Space>
            <Button type="primary" onClick={() => submit('accept')}>Accept Mediation</Button>
            <Button danger onClick={() => submit('decline')}>Decline</Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
}
