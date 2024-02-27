import PDFDocument from "pdfkit";
import PDFTable from "pdfkit-table";

const formatDate = (date) => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const formattedDate = formatDate(new Date());

export default async function PDFGenerator(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { companyData } = req.body;

  if (!companyData || companyData.length === 0) {
    return res.status(400).json({ error: "No data provided for generate PDF File.." });
  }

  const fileName = "Service-Order-Report.pdf";
  const AngsanaNew = "public/fonts/AngsanaNew.ttf";
  const AngsanaNewBold = "public/fonts/AngsanaNew-Bold.ttf";

  const doc = new PDFDocument({ autoFirstPage: false });
  const table = new PDFTable(doc, {
    bottomMargin: 30,
  });

  const addPageHeader = (company) => {
    doc
      .font(AngsanaNewBold)
      .fontSize(40)
      .text("SUB SRI THAI PUBLIC CO.,LTD", { align: "center" });
    doc.moveDown(0.2);
    doc
      .font(AngsanaNewBold)
      .fontSize(35)
      .text("Service Order Report", { align: "center" });
    doc.moveDown(0.5);
    doc
      .font(AngsanaNewBold)
      .fontSize(25)
      .text(
        `Account Name บริษัท ${company?.CompanyName} ${company?.CompanyCode}`,
        { align: "start", lineGap: -20 }
      );
    doc
      .font(AngsanaNewBold)
      .fontSize(23)
      .text(`${formattedDate}`, { align: "right" });

    doc.moveDown(2);
  };

  const addPageFooter = (currentCompanyPage, totalCompanyPages, currentPage) => {
    if (currentCompanyPage === currentPage) {
      doc.font(AngsanaNew).fontSize(22).text(`Page ${currentCompanyPage} of ${totalCompanyPages}`, { align: "right" });
    }
  };

  const addTable = (companyData) => {
    let totalPages = 0;

    const ROWS_PER_PAGE = 5;
    const columnWidths = {
      "ServiceOrderNo": 150,
      "Command": 228,
      "CommandTotalCount": 163,
      "ServiceType": 105,
      "Department": 100,
      "Business": 75,
      "Product": 135,
      "Borrower": 145,
      "Status": 95,
      "Responsible": 94,
      "created": 107,
      "ServiceDate": 97,
      "UrgentOrder": 97,
      "Remark": 95
    };

    companyData.forEach((company, index) => {
      const companyName = company.CompanyName;
      const isLastCompany = index === companyData.length - 1;

      let currentPage = 1;
      const startPage = totalPages + 1;
      addPageHeader(company);

      const headers = Object.keys(company.ServiceOrder[0]).map((key) => {
        const width = columnWidths[key] || 100;
        return {
          label: key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " "),
          property: key,
          valign: "center",
          align: key === "ServiceOrderNo" || key === "Command" ? "left" : "center",
          headerColor: "white",
          width,
        };
      });

      const rows = company.ServiceOrder.map((order) => { return Object.values(order); });
      const totalRows = rows.length;
      let rowIndex = 0;

      while (rowIndex < totalRows) {
        const remainingRows = totalRows - rowIndex;
        const rowsOnPage = remainingRows >= ROWS_PER_PAGE ? ROWS_PER_PAGE : remainingRows;
        const rowsForThisPage = rows.slice(rowIndex, rowIndex + rowsOnPage);

        table
          .setHeaders(headers)
          .setData(rowsForThisPage)
          .setColumnsDefaults({
            headerBorder: "B",
            align: "center",
            padding: 2,
          });

        doc.moveDown();
        table.draw(doc, 10, doc.y, { width: 780 });
        const endPage = totalPages + doc.bufferedPageRange().count;
        totalPages = endPage;

        const totalCompanyPages = Math.ceil(totalRows / ROWS_PER_PAGE);
        for (let i = startPage; i <= totalCompanyPages; i++) {
          let currentCompanyPage;
          if (i === totalCompanyPages && totalCompanyPages === 1) {
            currentCompanyPage = totalCompanyPages;
          } else {
            currentCompanyPage = currentPage - (totalCompanyPages - i) + 1;
          }
          addPageFooter(currentCompanyPage, totalCompanyPages, currentPage);
        }

        rowIndex += ROWS_PER_PAGE;

        if (rowIndex < totalRows || !isLastCompany) {
          currentPage++;

          doc.addPage({ layout: "landscape" });
          if (rowIndex < totalRows) {
            addPageHeader(company);
          } else if (rowIndex >= totalRows) {
            currentPage = 1;
            totalPages = 0;
          }
        }
      }
    });
  };

  try {
    addTable(companyData);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    doc.pipe(res); // Stream data directly to the HTTP response and send to the client
    doc.end();
    console.log("PDF File generated successfully!");
  } catch (error) {
    console.error("Error generating PDF:", error.message);
    res.status(500).send("Error generating PDF File, Please try again.");
  }
}