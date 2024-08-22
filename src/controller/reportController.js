

const Order = require("../model/orderSchema");
const Product = require("../model/productSchema");
const adminLayout = "./layouts/adminLayouts";
const excelJs = require("exceljs");
const PDFDocument = require("pdfkit");

module.exports = {
    getSalesReport: async (req, res) => {
        let perPage = 12;
        let page = parseInt(req.query.page) || 1;
      
        let { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
          const now = new Date();
          startDate = new Date(now.getFullYear(), now.getMonth(), 1); // First day of the current month
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of the current month
        } else {
          startDate = new Date(startDate);
          endDate = new Date(endDate);
        }
      
        startDate.setUTCHours(0, 0, 0, 0);
        endDate.setUTCHours(23, 59, 59, 999);
      
        try {
          const orders = await Order.aggregate([
            {
              $match: {
                createdAt: { $gte: startDate, $lte: endDate },
                status: { $ne: "cancelled" },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "customer_id",
                foreignField: "_id",
                as: "customer",
              },
            },
            { $unwind: "$items" },
            {
              $lookup: {
                from: "products",
                localField: "items.product_id",
                foreignField: "_id",
                as: "productDetails",
              },
            },
            {
              $group: {
                _id: "$_id",
                customer: { $first: "$customer" },
                shippingAddress: { $first: "$shippingAddress" },
                paymentMethod: { $first: "$paymentMethod" },
                status: { $first: "$status" },
                totalAmount: { $first: "$totalPrice" },
                discount: { $sum: "$couponDiscount" },
                createdAt: { $first: "$createdAt" },
                orderedItems: {
                  $push: {
                    product_name: {
                      $arrayElemAt: ["$productDetails.productName", 0],
                    },
                    price: "$items.price",
                    quantity: "$items.quantity",
                    itemTotal: "$items.itemTotal",
                  },
                },
              },
            },
            { $sort: { createdAt: -1 } }, // Sort by createdAt descending
            { $skip: (page - 1) * perPage },
            { $limit: perPage },
          ]);
      
          const count = await Order.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $ne: "cancelled" },
          });
      
          const overallSalesCount = await Order.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $ne: "cancelled" },
          });
      
          const overallOrderAmount = orders.reduce((acc, order) => acc + order.totalAmount, 0);
          const overallDiscount = orders.reduce((acc, order) => acc + order.discount, 0);
      
          res.render("admin/report/salesReport", {
            orders,
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
            overallSalesCount,
            overallOrderAmount,
            overallDiscount,
            layout: adminLayout,
            current: page,
            perPage,
            pages: Math.ceil(count / perPage),
            count,
            nextPage: page < Math.ceil(count / perPage) ? page + 1 : null,
          });
        } catch (err) {
          console.error("Error fetching sales report:", err);
          res.status(500).send("Internal Server Error");
        }
      },
      
      

      exportToExcel: async (req, res) => {
        // Date setup
        let startDate = req.query.startDate ? new Date(req.query.startDate) : new Date();
        let endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
        startDate.setUTCHours(0, 0, 0, 0);
        endDate.setUTCHours(23, 59, 59, 999);
    
        try {
            // Fetching orders
            const orders = await Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate, $lte: endDate },
                        status: { $ne: "cancelled" }
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "customer_id",
                        foreignField: "_id",
                        as: "customer"
                    }
                },
                { $unwind: "$items" },
                {
                    $lookup: {
                        from: "products",
                        localField: "items.product_id",
                        foreignField: "_id",
                        as: "productDetails"
                    }
                },
                {
                    $addFields: {
                        customerName: {
                            $concat: [
                                { $arrayElemAt: ["$customer.firstName", 0] },
                                " ",
                                { $arrayElemAt: ["$customer.lastName", 0] }
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        customerName: { $first: "$customerName" },
                        shippingAddress: { $first: "$shippingAddress" },
                        paymentMethod: { $first: "$paymentMethod" },
                        status: { $first: "$status" },
                        totalAmount: { $first: "$totalPrice" },
                        createdAt: { $first: "$createdAt" },
                        orderedItems: {
                            $push: {
                                product_name: { $arrayElemAt: ["$productDetails.product_name", 0] },
                                price: "$items.price",
                                quantity: "$items.quantity",
                                itemTotal: "$items.itemTotal"
                            }
                        }
                    }
                }
            ]);
    
            // Workbook and worksheet setup
            const workBook = new excelJs.Workbook();
            const worksheet = workBook.addWorksheet("Sales Report");
    
            worksheet.columns = [
                { header: "Order ID", key: "_id", width: 15 },
                { header: "Customer", key: "customer", width: 25 },
                { header: "Product Name", key: "productName", width: 30 },
                { header: "Price", key: "price", width: 10 },
                { header: "Quantity", key: "quantity", width: 10 },
                { header: "Item Total", key: "itemTotal", width: 15 },
                { header: "Total Amount", key: "totalAmount", width: 15 },
                { header: "Shipping Address", key: "shippingAddress", width: 30 },
                { header: "Payment Method", key: "paymentMethod", width: 15 },
                { header: "Status", key: "status", width: 15 },
                { header: "Date", key: "createdAt", width: 15 }
            ];
    
            // Adding rows
            orders.forEach(order => {
                order.orderedItems.forEach(item => {
                    worksheet.addRow({
                        _id: order._id.toString().slice(-7).toUpperCase(),
                        customer: order.customerName,
                        productName: item.product_name,
                        price: item.price,
                        quantity: item.quantity,
                        itemTotal: item.itemTotal,
                        totalAmount: order.totalAmount,
                        shippingAddress: `${order.shippingAddress.house_name}, ${order.shippingAddress.locality}, ${order.shippingAddress.state}, ${order.shippingAddress.zipcode}`,
                        paymentMethod: order.paymentMethod,
                        status: order.status,
                        createdAt: order.createdAt.toISOString().split("T")[0]
                    });
                });
            });
    
            // Styling headers
            worksheet.getRow(1).eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }; // Yellow background
                cell.font = { bold: true, color: { argb: '000000' } }; // Black text
                cell.alignment = { horizontal: 'center' };
            });
    
            // Optional: Styling rows (alternating colors for better readability)
            worksheet.eachRow({ includeEmpty: false, skipHeader: true }, (row, rowNumber) => {
                row.eachCell((cell, colNumber) => {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                });
                // Add alternating row color
                if (rowNumber % 2 === 0) {
                    row.eachCell({ includeEmpty: true }, (cell) => {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } }; // Light grey
                    });
                }
            });
    
            // Sending the response
            res.setHeader("content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("content-Disposition", "attachment; filename=orders.xlsx");
            await workBook.xlsx.write(res);
            res.status(200);
    
        } catch (err) {
            console.error("Error generating Excel:", err);
            res.status(500).send("Internal Server Error");
        }
    },
      

    exportToPdf: async (req, res) => {
      // Date setup
      let startDate = req.query.startDate ? new Date(req.query.startDate) : new Date();
      let endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
      startDate.setUTCHours(0, 0, 0, 0);
      endDate.setUTCHours(23, 59, 59, 999);
  
      try {
          // Fetching orders
          const orders = await Order.aggregate([
              {
                  $match: {
                      createdAt: { $gte: startDate, $lte: endDate },
                      status: { $ne: "cancelled" }
                  }
              },
              {
                  $lookup: {
                      from: "users",
                      localField: "customer_id",
                      foreignField: "_id",
                      as: "customer"
                  }
              },
              { $unwind: "$items" },
              {
                  $lookup: {
                      from: "products",
                      localField: "items.product_id",
                      foreignField: "_id",
                      as: "productDetails"
                  }
              },
              {
                  $group: {
                      _id: "$_id",
                      customer: { $first: "$customer" },
                      // shippingAddress: { $first: "$shippingAddress" },
                      paymentMethod: { $first: "$paymentMethod" },
                      status: { $first: "$status" },
                      totalAmount: { $first: "$totalPrice" },
                      createdAt: { $first: "$createdAt" },
                      orderedItems: {
                          $push: {
                              product_name: { $arrayElemAt: ["$productDetails.product_name", 0] },
                              price: "$items.price",
                              quantity: "$items.quantity",
                              itemTotal: "$items.itemTotal"
                          }
                      }
                  }
              }
          ]);
  
          const doc = new PDFDocument({ margin: 20, size: "A4" });
  
          let filename = "sales_report.pdf";
          filename = encodeURIComponent(filename);
          res.setHeader("content-disposition", 'attachment; filename="' + filename + '"');
          res.setHeader("content-type", "application/pdf");
  
          doc.fontSize(15).text("Sales Report", { align: "center" }).moveDown();
  
          // Define column widths and starting positions
          const margins = { left: 20, top: 50 };
          const columnWidths = {
              orderId: 80,
              date: 80,
              customer: 80,
              products: 80,
              totalAmount: 50,
              // shippingAddress: 80,
              paymentMethod: 60,
              status: 80
          };
          const rowHeight = 30;
          const pageWidth = doc.page.width - margins.left - 30; // Adjust based on page width and margins
  
          // Draw table header
          doc.fontSize(10).font('Helvetica-Bold');
          const drawHeader = () => {
              doc.text('Order ID', margins.left, margins.top, { width: columnWidths.orderId, align: 'left' });
              doc.text('Date', margins.left + columnWidths.orderId, margins.top, { width: columnWidths.date, align: 'left' });
              doc.text('Customer', margins.left + columnWidths.orderId + columnWidths.date, margins.top, { width: columnWidths.customer, align: 'left' });
              doc.text('Products', margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer, margins.top, { width: columnWidths.products, align: 'left' });
              doc.text('Total Amount', margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products, margins.top, { width: columnWidths.totalAmount, align: 'left' });
              // doc.text('Shipping Address', margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products + columnWidths.totalAmount, margins.top, { width: columnWidths.shippingAddress, align: 'left' });
              doc.text('Payment Method', margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products + columnWidths.totalAmount, margins.top, { width: columnWidths.paymentMethod, align: 'left' });
              doc.text('Status', margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products + columnWidths.totalAmount + columnWidths.paymentMethod, margins.top, { width: columnWidths.status, align: 'left' });
  
              doc.moveDown();
              doc.moveDown();
          };
  
          // Draw table rows
          const drawRows = () => {
              doc.fontSize(10).font('Helvetica');
              let yPosition = margins.top + rowHeight * 2;
              orders.forEach(order => {
                  const orderDate = order.createdAt.toISOString().split("T")[0];
                  const productNames = order.orderedItems.map(item => `${item.product_name} (Qty: ${item.quantity})`).join(", ");
                  const customerName = order.customer ? `${order.customer[0].firstName} ${order.customer[0].lastName}` : "";
                  // const address = `${order.shippingAddress.house_name}, ${order.shippingAddress.locality}, ${order.shippingAddress.city}, ${order.shippingAddress.state}, ${order.shippingAddress.zipcode}`;
  
                  doc.text(order._id.toString().slice(-7).toUpperCase(), margins.left, yPosition, { width: columnWidths.orderId, align: 'left' });
                  doc.text(orderDate, margins.left + columnWidths.orderId, yPosition, { width: columnWidths.date, align: 'left' });
                  doc.text(customerName, margins.left + columnWidths.orderId + columnWidths.date, yPosition, { width: columnWidths.customer, align: 'left' });
                  doc.text(productNames, margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer, yPosition, { width: columnWidths.products, align: 'left' });
                  doc.text(`₹${order.totalAmount.toFixed(2)}`, margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products, yPosition, { width: columnWidths.totalAmount, align: 'left' });
                  // doc.text(address, margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products + columnWidths.totalAmount, yPosition, { width: columnWidths.shippingAddress, align: 'left' });
                  doc.text(order.paymentMethod, margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products + columnWidths.totalAmount, yPosition, { width: columnWidths.paymentMethod, align: 'left' });
                  doc.text(order.status, margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products + columnWidths.totalAmount + columnWidths.paymentMethod, yPosition, { width: columnWidths.status, align: 'left' });
  
                  yPosition += rowHeight;
  
                  // Check if the current position is near the bottom of the page, and if so, add a new page
                  if (yPosition > doc.page.height - margins.top) {
                      doc.addPage();
                      drawHeader();
                      yPosition = margins.top + rowHeight * 2;
                  }
              });
          };
  
          // Draw header and rows
          drawHeader();
          drawRows();
  
          // Sending the PDF
          doc.pipe(res);
          doc.end();
      } catch (err) {
          console.log(err);
          res.status(500).send("Internal Server Error");
      }
  }

  
};
