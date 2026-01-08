import React from 'react';
import Layout from '@theme/Layout';
import { RagChat } from '@site/src/components/RagChat';

export default function ChatPage(): React.ReactElement {
  return (
    <Layout
      title="Chat"
      description="Ask questions about Roo Code documentation using AI"
    >
      <RagChat />
    </Layout>
  );
}
