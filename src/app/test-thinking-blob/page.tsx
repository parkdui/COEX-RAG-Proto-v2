'use client';

import { useState } from 'react';
import ThinkingBlob from '@/components/ui/ThinkingBlob';

export default function TestThinkingBlobPage() {
  const [isActive, setIsActive] = useState(true);

  return (
    <div 
      className="min-h-screen flex flex-col safe-area-inset overscroll-contain relative"
      style={{ 
        width: '100vw', 
        height: '100vh', 
        position: 'relative',
        background: 'transparent',
        overflow: 'hidden'
      }}
    >
      {/* ThinkingBlob 테스트 */}
      <ThinkingBlob isActive={isActive} />
      
      {/* 컨트롤 UI */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        fontFamily: 'Pretendard Variable, sans-serif'
      }}>
        <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: 600 }}>
          ThinkingBlob 테스트
        </h2>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span>isActive: {isActive ? 'true' : 'false'}</span>
          </label>
        </div>
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          background: '#f5f5f5', 
          borderRadius: '4px',
          fontSize: '12px',
          color: '#666'
        }}>
          <div>현재 상태: {isActive ? '활성화됨 (물결 효과 표시)' : '비활성화됨'}</div>
        </div>
      </div>
      
      {/* 안내 텍스트 */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '15px 25px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        fontFamily: 'Pretendard Variable, sans-serif',
        fontSize: '14px',
        color: '#333',
        textAlign: 'center'
      }}>
        물결 blob 애니메이션이 보여야 합니다. 위의 체크박스로 활성화/비활성화를 제어할 수 있습니다.
      </div>
    </div>
  );
}

