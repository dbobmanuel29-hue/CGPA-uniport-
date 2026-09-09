import { createContext, useContext, useState } from 'react';
import { uid } from '../utils/formatting';
export const blankCourse = () => ({ id: uid(), code: '', title: '', credits: '', points: '' });
const CalculatorContext = createContext(null);
export function CalculatorProvider({ children }) {
  const [rows, setRows] = useState(() => [blankCourse(), blankCourse(), blankCourse()]);
  const [maxPoint, setMaxPoint] = useState(5);
  return <CalculatorContext.Provider value={{ rows, setRows, maxPoint, setMaxPoint }}>{children}</CalculatorContext.Provider>;
}
export const useCalculator = () => useContext(CalculatorContext);