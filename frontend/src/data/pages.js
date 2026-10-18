export const pages = [
  { id: "checkin", title: "Check In", path: "/", description: "Mood check-in questions and answers." },
  { id: "iceCream", title: "Marry’s Ice Cream Shop", path: "/ice-cream", description: "The animated ice cream game." },
  { id: "invitation", title: "Question", path: "/invitation", description: "The invitation questions, choices and optional details." },
  { id: "records", title: "My Records", path: "/records", admin: true, description: "Admin link for check-ins, visits and invitation contact details." },
  { id: "invitationResponses", title: "Question Responses", path: "/invitation-responses", admin: true, description: "Admin link for the individual saved response entries." },
  { id: "settings", title: "Settings", path: "/settings", admin: true, description: "Admin link for page visibility and question settings." },
];

export function getPageVisibility(settings = {}) {
  return Object.fromEntries(pages.map(page => [page.id,
    typeof settings.pageVisibility?.[page.id] === "boolean" ? settings.pageVisibility[page.id]
      : page.id === "iceCream" ? settings.showIceCreamShop !== false : true,
  ]));
}
