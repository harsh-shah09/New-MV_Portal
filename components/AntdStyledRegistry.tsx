"use client";

import React from 'react';
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import type Entity from '@ant-design/cssinjs/es/Cache';
import { useServerInsertedHTML } from 'next/navigation';
import { ConfigProvider } from 'antd';

const StyledComponentsRegistry = ({ children }: { children: React.ReactNode }) => {
  const cache = React.useMemo<Entity>(() => createCache(), []);
  const isServerInserted = React.useRef<boolean>(false);

  useServerInsertedHTML(() => {
    // avoid duplicate css insert
    if (isServerInserted.current) {
      return;
    }
    isServerInserted.current = true;
    return <style id="antd" dangerouslySetInnerHTML={{ __html: extractStyle(cache, true) }} />;
  });

  return (
    <StyleProvider cache={cache}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#0891b2', // cyan-600 matching existing theme
            borderRadius: 8,
            fontFamily: 'inherit',
          },
          components: {
            Button: {
              colorPrimary: '#0891b2',
              algorithm: true, // Enable algorithm for hover effects
            },
            Input: {
              controlHeight: 42,
              activeBorderColor: '#0891b2',
              hoverBorderColor: '#0891b2',
            },
            Select: {
              controlHeight: 42,
              activeBorderColor: '#0891b2',
              hoverBorderColor: '#0891b2',
            },
            Table: {
              headerBg: '#f8fafc', // slate-50
              headerColor: '#475569', // slate-600
              rowHoverBg: '#f0f9ff', // light blue hover
            }
          }
        }}
      >
        {children}
      </ConfigProvider>
    </StyleProvider>
  );
};

export default StyledComponentsRegistry;
