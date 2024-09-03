const User = require('../model/userSchema');
const Product = require('../model/productSchema');
const Order = require('../model/orderSchema');
const Category = require("../model/categorySchema")

const adminLayout = './layouts/adminLayouts';

// function getDateRange(dateRange) {
//   const currentDate = new Date();
//   let startDate;
//   let endDate = currentDate;

//   switch (dateRange) {
//     case 'day':
//       startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
//       break;
//     case 'week':
//       const firstDayOfWeek = currentDate.getDate() - currentDate.getDay();
//       startDate = new Date(currentDate.setDate(firstDayOfWeek));
//       startDate.setHours(0, 0, 0, 0);
//       break;
//     case 'month':
//       startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
//       break;
//     case 'year':
//       startDate = new Date(currentDate.getFullYear(), 0, 1);
//       break;
//     case 'custom':
//       throw new Error("Custom date range requires startDate and endDate");
//     default:
//       throw new Error("Invalid date range");
//   }

//   return { startDate, endDate };
// }

// const getProductOrderAnalysis = async (dateRange, filterDate) => {
//   try {
//     const { startDate, endDate } = getDateRange(dateRange);  

//     const data = await Order.aggregate([
//       { $unwind: "$items" },
//       { $match: { "items.product_id": { $exists: true }, createdAt: { $gte: startDate, $lte: endDate } } },
//       {
//         $group: {
//           _id: "$items.product_id",
//           totalQuantity: { $sum: "$items.quantity" },
//           totalSales: { $sum: "$items.itemTotal" }
//         }
//       },
//       {
//         $lookup: {
//           from: "products",
//           localField: "_id",
//           foreignField: "_id",
//           as: "product"
//         }
//       },
//       { $unwind: "$product" },
//       {
//         $project: {
//           _id: 0,
//           productName: "$product.product_name", // Make sure the field name matches the schema
//           totalQuantity: 1,
//           totalSales: 1
//         }
//       }
//     ]);

//     return data;
//   } catch (error) {
//     throw new Error(`Error in getProductOrderAnalysis: ${error.message}`);
//   }
// };


// const getCategoryOrderAnalysis = async (dateRange, filterDate) => {
//   try {
//     const { startDate, endDate } = getDateRange(dateRange);

//     if (filterDate) {
//       startDate.setDate(new Date(filterDate).getDate());
//     }

//     const data = await Order.aggregate([
//       { $unwind: "$items" },
//       { $match: { "items.product_id": { $exists: true }, createdAt: { $gte: startDate, $lte: endDate } } },
//       {
//         $lookup: {
//           from: "products",
//           localField: "items.product_id",
//           foreignField: "_id",
//           as: "product"
//         }
//       },
//       { $unwind: "$product" },
//       {
//         $lookup: {
//           from: "categories", // Assuming the collection is named 'categories'
//           localField: "product.category",
//           foreignField: "_id",
//           as: "category"
//         }
//       },
//       { $unwind: "$category" },
//       {
//         $group: {
//           _id: "$category.name", // Use the category name field
//           totalQuantity: { $sum: "$items.quantity" },
//           totalSales: { $sum: "$items.itemTotal" }
//         }
//       },
//       {
//         $project: {
//           _id: 0,
//           category: "$_id",
//           totalQuantity: 1,
//           totalSales: 1
//         }
//       }
//     ]);

//     return data;
//   } catch (error) {
//     throw new Error(`Error in getCategoryOrderAnalysis: ${error.message}`);
//   }
// };

function getDateKey(date, timeRange) {
  switch (timeRange) {
    case 'today':
    case '1day':
      return `${date.getHours()}:00`;
    case '1week':
      return `Day ${date.getDate() - (new Date().getDate() - 1)}`; // Days since the start of the week
    case '1month':
      return `Day ${date.getDate()}`;
    case '1year':
      return `Month ${date.getMonth() + 1}`;
    default:
      return `${date.getFullYear()}`;
  }
}

function getLabelRange(timeRange, startDate, endDate) {
  const labels = [];
  const currentDate = new Date(endDate);

  switch (timeRange) {
    case 'today':
    case '1day':
      for (let i = 0; i < 24; i++) {
        labels.push(`${i}:00`);
      }
      break;
    case '1week':
      for (let i = 6; i >= 0; i--) {
        const labelDate = new Date();
        labelDate.setDate(labelDate.getDate() - i); // Go back i days from today
        labels.push(`Day ${labelDate.getDate()}`);
      }
      break;
    case '1month':
      for (let i = 1; i <= 31; i++) {
        labels.push(`Day ${i}`);
      }
      break;
    case '1year':
      for (let i = 1; i <= 12; i++) {
        labels.push(`Month ${i}`);
      }
      break;
    default:
      for (let i = 2019; i <= new Date().getFullYear(); i++) {
        labels.push(`${i}`);
      }
  }
  return labels;
}



module.exports = {

  getDashboard: async (req, res) => {
    const locals = { title: "Gift Shop - Dashboard" };

    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();
    const orderCount = await Order.countDocuments();
    const confirmedOrders = await Order.aggregate([
      { $match: { status: "Placed" } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalRevenue: { $sum: "$discountedTotalPrice" },
        },
      },
    ]).exec();

    // Default time range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const orders = await Order.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    let totalOrders = 0;
    let totalReturns = 0;
    let totalCancellations = 0;

    const productSalesMap = {};
    const categorySalesMap = {};

    for (const order of orders) {
      totalOrders++;
      if (order.status === 'returned') totalReturns++;
      if (order.status === 'cancelled') totalCancellations++;

      if (Array.isArray(order.items)) { // Check if order.items is an array
        for (const orderItem of order.items) {
          const product = await Product.findById(orderItem.product_id).populate('category');
          if (!product) continue;

          const salesAmount = orderItem.quantity * product.price;
          const productId = product._id.toString();
          const categoryId = product.category ? product.category._id.toString() : null;

          if (!productSalesMap[productId]) {
            productSalesMap[productId] = {
              _id: product._id,
              productName: product.product_name,
              productImage: product.primaryImages[0]?.path || null,
              categoryName: product.category ? product.category.name : 'Unknown',
              totalQuantity: 0,
              totalSales: 0,
            };
          }
          productSalesMap[productId].totalQuantity += orderItem.quantity;
          productSalesMap[productId].totalSales += salesAmount;

          if (categoryId) {
            if (!categorySalesMap[categoryId]) {
              categorySalesMap[categoryId] = {
                _id: categoryId,
                categoryName: product.category.name || 'Unknown',
                totalQuantity: 0,
                totalSales: 0,
              };
            }
            categorySalesMap[categoryId].totalQuantity += orderItem.quantity;
            categorySalesMap[categoryId].totalSales += salesAmount;
          }
        }
      } else {
        console.error(`order.items is not an array for order ${order._id}`);
      }
    }

    const topSellingProducts = Object.values(productSalesMap).sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 10);
    const topSellingCategories = Object.values(categorySalesMap).sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 10);

    res.render("admin/dashboard", {
      locals,
      userCount,
      productCount,
      orderCount,
      totalRevenue: confirmedOrders[0] ? confirmedOrders[0].totalRevenue : 0,
      totalOrders,
      totalReturns,
      totalCancellations,
      topSellingProducts,
      topSellingCategories,
      layout: adminLayout,
    });
},


getChartData: async (req, res) => {
  const timeRange = req.query.timeRange || '1month';
  const endDate = new Date();
  let startDate = new Date();
  
  switch (timeRange) {
      case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
      case '1month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      case '1year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      // Add other cases as needed
  }

  const orders = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
          $project: {
              _id: 0,
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              status: 1
          }
      },
      {
          $group: {
              _id: { date: "$date", status: "$status" },
              count: { $sum: 1 }
          }
      },
      {
          $group: {
              _id: "$_id.date",
              orders: {
                  $sum: { $cond: [{ $eq: ["$_id.status", "Placed"] }, "$count", 0] }
              },
              cancellations: {
                  $sum: { $cond: [{ $eq: ["$_id.status", "Cancelled"] }, "$count", 0] }
              },
              returns: {
                  $sum: { $cond: [{ $eq: ["$_id.status", "Returned"] }, "$count", 0] }
              }
          }
      },
      { $sort: { _id: 1 } } // Sort by date
  ]);

  const labels = orders.map(o => o._id);
  const ordersData = orders.map(o => o.orders);
  const cancellationsData = orders.map(o => o.cancellations);
  const returnsData = orders.map(o => o.returns);

  res.json({
      labels,
      orders: ordersData,
      cancellations: cancellationsData,
      returns: returnsData
  });
},





  // getDashboard: async (req, res) => {
  //   const locals = { title: "Gift Shop - Dashboard" };

  //   const userCount = await User.countDocuments();
  //   const productCount = await Product.countDocuments();
  //   const orderCount = await Order.find({
  //     status: "Placed",
  //   }).countDocuments();
  //   const confirmedOrders = await Order.aggregate([
  //     { $match: { status: "Placed" } },
  //     {
  //       $group: {
  //         _id: null,
  //         count: { $sum: 1 },
  //         totalRevenue: { $sum: "$discountedTotalPrice" },
  //       },
  //     },
  //   ]).exec()

  //   res.render("admin/dashboard", {
  //     locals,
  //     userCount,
  //     productCount,
  //     orderCount,
  //     totalRevenue: confirmedOrders[0] ? confirmedOrders[0].totalRevenue : 0,
  //     layout: adminLayout,
  //   });
  // },


  getUserList: async (req, res) => {
    const locals = {
      title: "Customers",
    };
    let perPage = 3;
    let page = req.query.page || 1;
    const users = await User.aggregate([{ $sort: { createdAt: -1 } }])
      .skip(perPage * page - perPage)
      .limit(perPage)
      .exec();
    const count = await Product.find().countDocuments({});
    const nextPage = parseInt(page) + 1;
    const hasNextPage = nextPage <= Math.ceil(count / perPage);
    res.render("admin/users/users", {
      locals,
      users,
      current: page,
      pages: Math.ceil(count / perPage),
      nextPage: hasNextPage ? nextPage : null,
      perPage,

      layout: adminLayout

    }
    )
  },
  toggleBlock: async (req, res) => {
    try {
      let user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      user.isBlocked = !user.isBlocked;
      await user.save();
      res
        .status(200)
        .json({
          message: user.isBlocked
            ? "User blocked successfully"
            : "User unblocked successfully",
        });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  },



  // ChartCtrl: async (req, res) => {
  //   const { filterType, dateRange, filterDate } = req.query;

  //   try {
  //     let data;
  //     if (filterType === 'products') {
  //       data = await getProductOrderAnalysis(dateRange, filterDate);
  //     } else if (filterType === 'categories') {
  //       data = await getCategoryOrderAnalysis(dateRange, filterDate);
  //     } else {
  //       return res.status(400).json({ error: 'Invalid filterType' });
  //     }

  //     if (!data || data.length === 0) {
  //       return res.status(404).json({ message: 'No data found' });
  //     }

  //     res.json(data);
  //   } catch (error) {
  //     console.error('Error processing request:', error);
  //     res.status(500).json({ error: 'Internal Server Error' });
  //   }
  // }
};
