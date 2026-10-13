export default function SkeletonRow() {
  return (
    <tr aria-hidden="true" className="animate-pulse">
      {Array.from({ length: 8 }).map((_, index) => (
        <td key={index} className="px-4 py-3">
          <div className="h-4 w-full rounded bg-gray-200" />
        </td>
      ))}
    </tr>
  );
}
