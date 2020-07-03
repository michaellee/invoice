const TOML        = require('toml')
const Moment      = require('moment')
const Handlebars  = require('handlebars')
const FS          = require('fs')
const PDF         = require('html-pdf')
const topHalf     = require('./template/topHalf')
const bottomHalf  = require('./template/bottomHalf')

const monthMap = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

let invoiceDate = (date) => {
  if (date) {
    return `${monthMap[Moment(date).month()]} ${Moment(date).date()}, ${Moment(date).year()}`
  } else {
    return `${monthMap[Moment().month()]} ${Moment().date()}, ${Moment().year()}`
  }
}

FS.readFile(process.argv[2], (err, tomlData) => {
  let parsedToml = TOML.parse(tomlData)

  if (parsedToml['invoiceDetail'].hasOwnProperty('date')) {
    parsedToml['invoiceDetail']['date'] = invoiceDate(parsedToml['invoiceDetail']['date'])
  } else {
    parsedToml['invoiceDetail']['date'] = invoiceDate()
  }

  let calculateLineTotal = (items) => {
    let updatedItems = []
    items.forEach((item) => {
      item['lineTotal'] = item['unitCost'] * item['quantity']
      updatedItems.push(item)
    })
    return updatedItems
  }

  let calculateTotal = (items) => {
    let total = 0
    items.forEach((item) => {
      total += item['lineTotal']
    })
    return total
  }

  parsedToml['items'] = calculateLineTotal(parsedToml['items'])
  parsedToml['total'] = calculateTotal(parsedToml['items'])

  Handlebars.registerHelper('formatAmount', function(amount) {
    return amount.toLocaleString('en')
  })

  Handlebars.registerHelper('calculateBalance', function(amount, paid) {
    return (amount - paid).toLocaleString('en')
  })

  let templateSource = `
  <div>
  {{myInfo.firstName}} {{myInfo.lastName}}<br>
  {{myInfo.address}}<br>
  {{myInfo.city}}, {{myInfo.state}} {{myInfo.zip}}
  </div>

  <div class="clearfix mt6">
    <div class="col col-6">
      {{client.name}}
    </div>
    <div class="col col-6">
      <div class="clearfix px1">
        <div class="col col-6">Invoice #</div>
        <div class="col col-6 align-right">{{invoiceDetail.id}}</div>
      </div>
      <div class="clearfix px1">
        <div class="col col-6">Invoice Date</div>
        <div class="col col-6 align-right">{{invoiceDetail.date}}</div>
      </div>
      <div class="clearfix bold border bg-light-gray p1">
        <div class="col col-6">Balance (USD)</div>
        <div class="col col-6 align-right">\${{calculateBalance total paid}}</div>
      </div>
    </div>
  </div>

  <table class="col-12 border-bottom mt6">
    <tr class="bg-light-gray border">
      <th class="align-left p1 col-2">Item</th>
      <th class="align-left p1 col-5">Description</th>
      <th class="align-right p1 col-2">Unit Cost</th>
      <th class="align-right p1 col-1">Quantity</th>
      <th class="align-right p1 col-2">Line Total</th>
    </tr>
    {{#items}}
    <tr>
      <td class="align-left p1">{{type}}</td>
      <td class="align-left p1">{{description}}</td>
      <td class="align-right p1">{{formatAmount unitCost}}</td>
      <td class="align-right p1">{{quantity}}</td>
      <td class="align-right p1">{{formatAmount lineTotal}}</td>
    </tr>
    {{/items}}
  </table>

  <div class="clearfix">
    <div class="col-5 right">
      <div class="clearfix bold">
        <div class="col col-6 p1">Total</div>
        <div class="col col-6 align-right p1">{{formatAmount total}}</div>
      </div>
      <div class="clearfix">
        <div class="col col-6 p1">Amount Paid</div>
        <div class="col col-6 align-right p1">{{formatAmount paid}}</div>
      </div>
      <div class="clearfix bold border bg-light-gray">
        <div class="col col-6 p1">Balance (USD)</div>
        <div class="col col-6 align-right p1">\${{calculateBalance total paid}}</div>
      </div>
    </div>
  </div>
  `

  let template = Handlebars.compile(templateSource)

  let result = template(parsedToml)

  result = topHalf + result + bottomHalf

  PDF.create(result, { format: 'Letter', border: "0.35in" }).toFile(process.argv[3], (err, res) => {
    if (err) {
      console.log(err)
    }

    console.log(res)
  })
})
