/** Lỗi nghiệp vụ có mã HTTP; không trả stack trace ra trình duyệt. */
class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const ensure = (condition, message, status = 400) => {
  if (!condition) throw new AppError(message, status);
};
module.exports = { AppError, ensure };
