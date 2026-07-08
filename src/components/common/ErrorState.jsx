import Button from "@components/common/Button";

/**
 * ErrorState — 에러 표시 + 재시도.
 * props: { title?, description?, onRetry? }
 */
export default function ErrorState({
  title = "문제가 발생했어요",
  description = "잠시 후 다시 시도해 주세요.",
  onRetry,
}) {
  return (
    <div className="state" role="alert">
      <p className="state__title">{title}</p>
      {description && <p className="state__desc">{description}</p>}
      {onRetry && (
        <div className="state__action">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            다시 시도
          </Button>
        </div>
      )}
    </div>
  );
}
