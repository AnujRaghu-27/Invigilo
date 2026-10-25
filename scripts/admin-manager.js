#!/usr/bin/env node
/**
 * Admin Management CLI for Invigilo
 *
 * This script allows authorized test administrators/invigilators to:
 * 1. View all recorded quit attempts and their UFM / Safe Quit statuses.
 * 2. Update a record's status from UFM to Safe Quit with audit logging.
 *
 * Usage:
 *   node scripts/admin-manager.js --list
 *   node scripts/admin-manager.js --update <target> --status "Safe Quit" --admin "Invigilator Name" --secret "invigilo-admin-secret-2026" --note "Reason"
 */

const path = require("path");
const quitRecordsStore = require("../electron/quitRecords");

const args = process.argv.slice(2);

function getArgValue(flag) {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return null;
}

const isList = args.includes("--list");
const updateTarget = getArgValue("--update") || getArgValue("--timestamp") || getArgValue("--student");
const newStatus = getArgValue("--status") || "Safe Quit";
const adminId = getArgValue("--admin") || "Admin_Invigilator";
const adminSecret = getArgValue("--secret") || process.env.INVIGILO_ADMIN_SECRET || quitRecordsStore.ADMIN_SECRET;
const note = getArgValue("--note") || "Approved as Safe Quit after direct verification";

if (isList) {
  try {
    const records = quitRecordsStore.readRecords();
    console.log("\n=======================================================");
    console.log("            INVIGILO QUIT & UFM RECORDS               ");
    console.log("=======================================================\n");

    if (records.length === 0) {
      console.log("No quit records found.\n");
      process.exit(0);
    }

    console.table(
      records.map((r, idx) => ({
        "#": idx + 1,
        "Student ID": r.studentId,
        Timestamp: r.timestamp,
        Status: r.status,
        "Reviewed By": r.adminReview ? r.adminReview.reviewedBy : "Pending Review",
      }))
    );

    console.log("\nDetails:");
    records.forEach((r, idx) => {
      console.log(`\n[${idx + 1}] Student: ${r.studentId}`);
      console.log(`    Timestamp: ${r.timestamp}`);
      console.log(`    Status: ${r.status}`);
      if (r.adminReview) {
        console.log(`    Admin Review:`);
        console.log(`      Reviewed By: ${r.adminReview.reviewedBy}`);
        console.log(`      Reviewed At: ${r.adminReview.reviewedAt}`);
        console.log(`      Note: ${r.adminReview.note}`);
      } else {
        console.log(`    Admin Review: null`);
      }
    });
    console.log("\n");
  } catch (err) {
    console.error("Error reading records:", err.message);
    process.exit(1);
  }
} else if (updateTarget || args.includes("--update")) {
  try {
    const updated = quitRecordsStore.updateRecordStatus({
      target: updateTarget,
      newStatus,
      adminSecret,
      adminId,
      note,
    });
    console.log("\n✅ Record successfully updated by admin!");
    console.log("-----------------------------------------");
    console.log(`Student ID:  ${updated.studentId}`);
    console.log(`Timestamp:   ${updated.timestamp}`);
    console.log(`New Status:  ${updated.status}`);
    console.log(`Reviewed By: ${updated.adminReview.reviewedBy}`);
    console.log(`Reviewed At: ${updated.adminReview.reviewedAt}`);
    console.log(`Note:        ${updated.adminReview.note}\n`);
  } catch (err) {
    console.error(`\n❌ Failed to update record: ${err.message}\n`);
    process.exit(1);
  }
} else {
  console.log(`
Invigilo Admin Management Tool
------------------------------
Commands:
  --list                                  List all recorded quit attempts and their UFM status
  --update <#|timestamp|studentId>       Update a record's status (default: "Safe Quit")
  --status <"Safe Quit"|"UFM">           Specify target status
  --admin <AdminName>                    Specify admin/invigilator name
  --secret <AdminSecret>                 Provide admin secret key
  --note <Explanation>                   Add an audit review note

Examples:
  node scripts/admin-manager.js --list
  node scripts/admin-manager.js --update 1 --status "Safe Quit" --admin "Dr. Sharma" --note "Student medical emergency verified"
  node scripts/admin-manager.js --update 2026-10-25T15:08:09.013Z --status "Safe Quit"
`);
}
