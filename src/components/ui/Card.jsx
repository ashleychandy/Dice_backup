import React from 'react';
import { motion } from 'framer-motion';

const Card = ({
  children,
  className = '',
  withAnimation = false,
  ...props
}) => {
  const Component = withAnimation ? motion.div : 'div';
  const animationProps = withAnimation
    ? {
        whileHover: { y: -5, transition: { duration: 0.2 } },
        transition: { duration: 0.2 },
      }
    : {};

  return (
    <Component
      className={`glass-panel p-6 rounded-2xl ${className}`}
      {...animationProps}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Card;
