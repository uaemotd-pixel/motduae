import {
  bodyText,
  ctaButton,
  escapeHtml,
  emailTheme,
  renderLayout,
} from "./layout.js";

const SUBJECT_STATUS = {
  submitted: "received",
  resubmitted: "resubmitted",
  approved: "approved",
  rejected: "rejected",
};

const LAYOUT_TITLE = {
  submitted: "Application received",
  resubmitted: "Application resubmitted",
  approved: "Application approved",
  rejected: "Application rejected",
};

const SIGN_OFF = ["Kind regards,", "MOTD Support Team"];

function noteToHtml(note) {
  return escapeHtml(note || "").replace(/\r\n|\r|\n/g, "<br/>");
}

function para(html, extra = {}) {
  return bodyText({
    html,
    color: extra.color || emailTheme.nearBlack,
    margin: extra.margin || "0 0 12px 0",
  });
}

function listHtml(items) {
  const rows = items
    .map(
      (item) =>
        `<li style="margin:0 0 6px 0;padding:0;">${escapeHtml(item)}</li>`,
    )
    .join("");
  return `<ul style="font-family:${emailTheme.fontBody};font-size:14px;line-height:1.65;color:${emailTheme.nearBlack};margin:0 0 16px 0;padding:0 0 0 20px;">${rows}</ul>`;
}

function ctaBlock(url, label) {
  if (!url) return "";
  const safeUrlHtml = escapeHtml(url);
  return `
    ${ctaButton({ href: url, label })}
    ${bodyText({
      html: `If the button does not work, copy and paste this link into your browser:<br/><a class="em-link" href="${safeUrlHtml}" style="color:${emailTheme.muted};word-break:break-all;overflow-wrap:anywhere;text-decoration:underline;">${safeUrlHtml}</a>`,
      color: emailTheme.muted,
      margin: "0 0 16px 0",
    })}
  `;
}

function submittedCopy({ requestNumber }) {
  return {
    blocks: [
      {
        type: "p",
        text: `Thank you for submitting your MOTD partner application. We are writing to confirm that we have received it.`,
      },
      {
        type: "p",
        text: `Your application number is ${requestNumber}. Please keep this number for your records. You will need it if you contact us.`,
      },
      {
        type: "p",
        text: `The MOTD team will now review the information you provided. We will write again when a decision has been made, or if we need further information.`,
      },
      {
        type: "p",
        text: `You may sign in to the MOTD Partner Portal to see the  application status on your wait screen.`,
      },
      {
        type: "p",
        text: `If you did not submit this application, please contact MOTD Partner Support.`,
      },
    ],
    ctaLabel: "Open your portal",
  };
}

function resubmittedCopy({ requestNumber }) {
  return {
    blocks: [
      {
        type: "p",
        text: `We are writing to confirm that we have received your updated MOTD partner application. Your application number remains ${requestNumber}.`,
      },
      {
        type: "p",
        text: `The MOTD team will review the latest information you submitted. We will write again when a decision has been made, or if we need further information.`,
      },
      {
        type: "p",
        text: `The previous decision email still stands until we write again. This message only confirms that your update is now in the review queue.`,
      },
      {
        type: "p",
        text: `You may sign in to the MOTD Partner Portal to see the  application status. The form cannot be edited while this review is open.`,
      },
    ],
    ctaLabel: "Open your portal",
  };
}

function rejectedCopy({ requestNumber, rejectionNote }) {
  return {
    blocks: [
      {
        type: "p",
        text: `We are writing regarding your MOTD partner application ${requestNumber}. After review, we are unable to approve it in its current form.`,
      },
      {
        type: "p",
        text: `Please find below the reason provided by MOTD:`,
      },
      { type: "note", text: rejectionNote },
      {
        type: "p",
        text: `You may edit the same application and submit it again. Your application number will remain ${requestNumber}. Sign in to the MOTD Partner Portal, open Edit application (or use the button below), address the points in the note, confirm that the information is accurate, and submit.`,
      },
      {
        type: "p",
        text: `Until you submit again, your business will not be listed on MOTD.`,
      },
      {
        type: "p",
        text: `If anything in the note is unclear, reply to this email or use Contact on the website and quote your application number ${requestNumber}.`,
      },
    ],
    ctaLabel: "Edit your application",
  };
}

function approvedCopy({ requestNumber }) {
  return {
    blocks: [
      {
        type: "p",
        text: `We are pleased to inform you that your MOTD partner application ${requestNumber} has been approved. Your business profile is now approved to use the MOTD Partner Portal.`,
      },
      {
        type: "p",
        text: `Your shop profile has been created using the information provided in your application. Before you can begin adding designs or fabrics, please complete the following items in your shop profile:`,
      },
      {
        type: "list",
        items: ["Shop URL slug", "Pickup address", "Cover image"],
      },
      {
        type: "p",
        text: `Your catalogue will remain locked until your shop profile is fully completed.`,
      },
      {
        type: "p",
        text: `To complete your profile, sign in to the MOTD Partner Portal, open the Shop section, and provide the missing information. Once your profile is complete, you can begin listing your designs and fabrics.`,
      },
      {
        type: "p",
        text: `For any questions or support regarding your application, please quote your application number ${requestNumber}.`,
      },
    ],
    ctaLabel: "Open your shop profile",
  };
}

const COPY = {
  submitted: submittedCopy,
  resubmitted: resubmittedCopy,
  approved: approvedCopy,
  rejected: rejectedCopy,
};

function blocksToText(blocks) {
  const lines = [];
  for (const block of blocks) {
    if (block.type === "list") {
      for (const item of block.items) {
        lines.push(`- ${item}`);
      }
      lines.push("");
      continue;
    }
    if (block.type === "note") {
      lines.push(block.text || "");
      lines.push("");
      continue;
    }
    lines.push(block.text);
    lines.push("");
  }
  return lines;
}

function blocksToHtml(blocks) {
  return blocks
    .map((block) => {
      if (block.type === "list") return listHtml(block.items);
      if (block.type === "note") return para(noteToHtml(block.text));
      return para(escapeHtml(block.text));
    })
    .join("");
}

export function partnerApplicationTemplate({
  kind,
  name,
  requestNumber,
  role,
  portalUrl,
  rejectionNote,
}) {
  const status = SUBJECT_STATUS[kind] || kind;
  const number = String(requestNumber || "").trim();
  const displayName = String(name || "").trim() || "Partner";
  const copy = (COPY[kind] || COPY.submitted)({
    name: displayName,
    role: role === "store" ? "store" : "workshop",
    requestNumber: number,
    rejectionNote: rejectionNote || "",
  });

  const subject = `Application ${status} · ${number}`;
  const text = [
    `Dear ${displayName},`,
    "",
    ...blocksToText(copy.blocks),
    copy.ctaLabel && portalUrl ? copy.ctaLabel : "",
    portalUrl || "",
    "",
    ...SIGN_OFF,
  ]
    .filter((line, index, arr) => !(line === "" && arr[index - 1] === ""))
    .join("\n")
    .trim();

  const bodyHtml = `
    ${para(`Dear ${escapeHtml(displayName)},`, {
      color: emailTheme.muted,
      margin: "0 0 16px 0",
    })}
    ${blocksToHtml(copy.blocks)}
    ${ctaBlock(portalUrl, copy.ctaLabel)}
    ${para(escapeHtml(SIGN_OFF[0]), {
      color: emailTheme.muted,
      margin: "16px 0 0 0",
    })}
    ${para(escapeHtml(SIGN_OFF[1]), {
      color: emailTheme.muted,
      margin: "0",
    })}
  `;

  return {
    subject,
    text,
    html: renderLayout({
      title: LAYOUT_TITLE[kind] || "Application",
      bodyHtml,
    }),
  };
}
