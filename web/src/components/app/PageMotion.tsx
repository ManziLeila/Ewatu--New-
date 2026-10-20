import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { pageMotion } from '@/lib/motion';

export function PageMotion({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} {...pageMotion}>
      {children}
    </motion.div>
  );
}
