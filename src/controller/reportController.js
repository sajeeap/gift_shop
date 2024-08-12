

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
                    $group: {
                        _id: "$_id",
                        customer: { $first: "$customer.firstName" },
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
                { header: "Order ID", key: "_id" },
                { header: "Customer", key: "customer" },
                { header: "Product Name", key: "productName" },
                { header: "Price", key: "price" },
                { header: "Quantity", key: "quantity" },
                { header: "Item Total", key: "itemTotal" },
                { header: "Total Amount", key: "totalAmount" },
                { header: "Shipping Address", key: "shippingAddress" },
                { header: "Payment Method", key: "paymentMethod" },
                { header: "Status", key: "status" },
                { header: "Date", key: "createdAt" }
            ];
    
            // Adding rows
            orders.forEach(order => {
                order.orderedItems.forEach(item => {
                    worksheet.addRow({
                        _id: order._id.toString().slice(-7).toUpperCase(),
                        customer: order.customer,
                        productName: item.product_name,
                        price: item.price,
                        quantity: item.quantity,
                        itemTotal: item.itemTotal,
                        totalAmount: order.totalAmount,
                        shippingAddress: `${order.shippingAddress.house_name}, ${order.shippingAddress.locality}, ${order.shippingAddress.city}, ${order.shippingAddress.state}, ${order.shippingAddress.zipcode}`,
                        paymentMethod: order.paymentMethod,
                        status: order.status,
                        createdAt: order.createdAt.toISOString().split("T")[0]
                    });
                });
            });
    
            // Styling (headers and rows)
            worksheet.getRow(1).eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3CF696' } };
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            });
    
            worksheet.eachRow({ includeEmpty: false, skipHeader: true }, (row) => {
                row.eachCell((cell) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E6DE' } };
                });
            });
    
            // Sending the response
            res.setHeader("content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("content-Disposition", "attachment; filename=orders.xlsx");
            return workBook.xlsx.write(res).then(() => {
                res.status(200);
            });
    
        } catch (err) {
            console.log(err);
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
  
          const doc = new PDFDocument({ margin: 30, size: "A4" });
  
          let filename = "sales_report.pdf";
          filename = encodeURIComponent(filename);
          res.setHeader("content-disposition", 'attachment; filename="' + filename + '"');
          res.setHeader("content-type", "application/pdf");
  
          doc.fontSize(20).text("Sales Report", { align: "center" }).moveDown();
  
          // Adding table headers
          doc.fontSize(12).text("Order ID | Date | Customer | Products | Total Amount | Shipping Address | Payment Method | Status", { underline: true }).moveDown();
  
          // Adding orders
          orders.forEach(order => {
              const orderDate = order.createdAt.toISOString().split("T")[0];
              const productNames = order.orderedItems.map(item => `${item.product_name} (Qty: ${item.quantity})`).join(", ");
              const customerName = order.customer ? `${order.customer[0].firstName} ${order.customer[0].lastName}` : "";
              const address = `${order.shippingAddress.house_name}, ${order.shippingAddress.locality}, ${order.shippingAddress.city}, ${order.shippingAddress.state}, ${order.shippingAddress.zipcode}`;
  
              doc.fontSize(12).text(`${order._id.toString().slice(-7).toUpperCase()} | ${orderDate} | ${customerName} | ${productNames} | ${order.totalAmount} | ${address} | ${order.paymentMethod} | ${order.status}`).moveDown();
              doc.text("------------------------------------------------------------------------------------------------------", { align: "center" }).moveDown();
          });
  
          // Sending the PDF
          doc.pipe(res);
          doc.end();
      } catch (err) {
          console.log(err);
          res.status(500).send("Internal Server Error");
      }
  }
  
};
