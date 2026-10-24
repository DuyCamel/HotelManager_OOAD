/** Mapping cột SQL của backups. TODO TV3 C1: giữ đúng kiểu/độ dài trong database/01_schema.sql. */
module.exports = {
  backups: [
    "BackupHistory",
    "BackupId",
    {
      filePath: "FilePath",
      backupAt: "BackupAt",
      createdBy: "CreatedBy",
      status: "StatusCode",
      note: "Note",
    },
  ],
};
