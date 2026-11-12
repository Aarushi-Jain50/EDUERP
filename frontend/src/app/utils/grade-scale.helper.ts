export const getGrade = (marksPercentage: number): { grade: string, point: number } => {
  if (marksPercentage >= 90) return { grade: 'O', point: 10 };
  if (marksPercentage >= 80) return { grade: 'A+', point: 9 };
  if (marksPercentage >= 70) return { grade: 'A', point: 8 };
  if (marksPercentage >= 60) return { grade: 'B+', point: 7 };
  if (marksPercentage >= 50) return { grade: 'B', point: 6 };
  if (marksPercentage >= 40) return { grade: 'C', point: 5 };
  return { grade: 'F', point: 0 };
};
