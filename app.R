# --- 1. Load Required Libraries ---
library(shiny)
library(dplyr)
library(DT)
library(stringr)
library(readr)

# --- 2. Load Your Data ---
# Replace "your_data.csv" with the actual path to your CSV file
# If the CSV is in the same folder as app.R, just use the filename
data <- read_csv("dod-data.csv", col_types = cols(
  date = col_character(),  # We'll handle year extraction separately
  .default = col_character()
))

# Extract year from date column for filtering
# This assumes date is in a format like "YYYY-MM-DD" or "YYYY"
data <- data %>%
  mutate(year = as.integer(str_extract(date, "^\\d{4}")))

year_min <- min(data$year, na.rm = TRUE)
year_max <- max(data$year, na.rm = TRUE)

# --- 3. Define the User Interface (UI) ---
ui <- fluidPage(

  titlePanel("Bibliographic Records Catalog"),

  # Hidden tabs switch between the catalog and the detail view. Both pages
  # stay in the UI, so the filters keep their values when the user comes back.
  tabsetPanel(
    id = "pages",
    type = "hidden",

    # Main catalog page
    tabPanelBody(
      "catalog",
      sidebarLayout(

        # --- Sidebar Panel for Filters ---
        sidebarPanel(
          width = 3,

          h4("Search & Filter"),

          # Text search
          textInput(inputId = "searchText",
                    label = "Search (Title, Creator, Subject, Location):",
                    placeholder = "Enter search terms..."),

          # Year range slider
          sliderInput(inputId = "yearRange",
                      label = "Year Range:",
                      min = year_min,
                      max = year_max,
                      value = c(year_min, year_max),
                      sep = "",
                      step = 1),

          # Institution filter
          selectInput(inputId = "institutionFilter",
                      label = "Institution:",
                      choices = c("All", sort(unique(data$institution)))),

          # Field Station filter
          selectInput(inputId = "fieldstationFilter",
                      label = "Field Station:",
                      choices = c("All", sort(unique(data$fieldstation)))),

          # Course Number filter
          selectInput(inputId = "coursenumberFilter",
                      label = "Course Number:",
                      choices = c("All", sort(unique(data$coursenumber)))),

          # Course Name filter
          selectInput(inputId = "coursenameFilter",
                      label = "Course Name:",
                      choices = c("All", sort(unique(data$coursename)))),

          hr(),

          # Download button
          downloadButton("downloadData", "Download Filtered Results")
        ),

        # --- Main Panel for Results Table ---
        mainPanel(
          width = 9,

          h4("Search Results"),
          textOutput("recordCount"),
          br(),
          DT::dataTableOutput(outputId = "resultsTable")
        )
      )
    ),

    # Detail view page
    tabPanelBody(
      "detail",
      fluidRow(
        column(12,
               actionButton("backButton", "← Back to Search Results",
                            style = "margin-bottom: 20px;"),
               hr(),
               uiOutput("detailView")
        )
      )
    )
  )
)

# --- 4. Define the Server Logic ---
server <- function(input, output, session) {

  selected_record <- reactiveVal(NULL)

  # --- Filtered Data (Reactive Expression) ---
  filtered_data <- reactive({

    df <- data

    # Text search across multiple fields (case-insensitive).
    # fixed() matches the text literally, so characters like "(" are safe.
    search_term <- str_trim(if (is.null(input$searchText)) "" else input$searchText)
    if (search_term != "") {
      pattern <- fixed(search_term, ignore_case = TRUE)
      df <- df %>%
        filter(
          str_detect(title, pattern) |
            str_detect(creator, pattern) |
            str_detect(subject, pattern) |
            str_detect(location, pattern)
        )
    }

    # Year range filter. Skipped while the slider covers the full range,
    # so records without a usable date still appear by default.
    if (!is.null(input$yearRange) &&
        (input$yearRange[1] > year_min || input$yearRange[2] < year_max)) {
      df <- df %>%
        filter(year >= input$yearRange[1] & year <= input$yearRange[2])
    }

    # Institution filter
    if (!is.null(input$institutionFilter) && input$institutionFilter != "All") {
      df <- df %>%
        filter(institution == input$institutionFilter)
    }

    # Field Station filter
    if (!is.null(input$fieldstationFilter) && input$fieldstationFilter != "All") {
      df <- df %>%
        filter(fieldstation == input$fieldstationFilter)
    }

    # Course Number filter
    if (!is.null(input$coursenumberFilter) && input$coursenumberFilter != "All") {
      df <- df %>%
        filter(coursenumber == input$coursenumberFilter)
    }

    # Course Name filter
    if (!is.null(input$coursenameFilter) && input$coursenameFilter != "All") {
      df <- df %>%
        filter(coursename == input$coursenameFilter)
    }

    return(df)
  })

  # --- Display Filtered Data ---
  output$resultsTable <- DT::renderDataTable({

    # Select only the columns to display
    display_data <- filtered_data() %>%
      select(fieldstation, objectid, object_location, date, creator, title, pages, subject) %>%
      mutate(
        # objectid link sends the record's ID to input$openRecord.
        # priority "event" makes repeat clicks on the same record fire again.
        objectid = sprintf(
          '<a href="#" data-id="%s" onclick="Shiny.setInputValue(\'openRecord\', this.dataset.id, {priority: \'event\'}); return false;">%s</a>',
          htmltools::htmlEscape(objectid, attribute = TRUE),
          htmltools::htmlEscape(objectid)
        ),
        # object_location opens the item in a new tab
        object_location = ifelse(
          is.na(object_location), "",
          sprintf('<a href="%s" target="_blank" rel="noopener">%s</a>',
                  htmltools::htmlEscape(object_location, attribute = TRUE),
                  htmltools::htmlEscape(object_location))
        )
      )

    DT::datatable(
      display_data,
      options = list(
        pageLength = 25,
        lengthMenu = c(10, 25, 50, 100),
        scrollX = TRUE
      ),
      rownames = FALSE,
      # Only the two link columns contain HTML; escape everything else
      escape = setdiff(names(display_data), c("objectid", "object_location")),
      selection = 'none'
    )
  })

  # Handle clicks on objectid to show detail view
  observeEvent(input$openRecord, {
    selected_record(filter(data, objectid == input$openRecord))
    updateTabsetPanel(session, "pages", selected = "detail")
  })

  # Handle back button
  observeEvent(input$backButton, {
    updateTabsetPanel(session, "pages", selected = "catalog")
  })

  # --- Record Count Display ---
  output$recordCount <- renderText({
    paste("Showing", nrow(filtered_data()), "of", nrow(data), "records")
  })

  # --- Detail View ---
  output$detailView <- renderUI({
    req(selected_record())

    record <- selected_record()

    # Create catalog-style display
    tagList(
      h3(record$title),
      hr(),
      p(strong("Abstract:"), br(), record$abstract),
      p(strong("Field Station:"), record$fieldstation),
      p(strong("Date:"), record$date),
      p(strong("Creator:"), record$creator),
      p(strong("Secondary Creator:"), record$secondarycreator),
      p(strong("Pages:"), record$pages),
      p(strong("Subject:"), record$subject),
      p(strong("Location:"), record$location),
      p(strong("Object ID:"), record$objectid),
      p(strong("Object Location:"),
        tags$a(href = record$object_location,
               target = "_blank",
               record$object_location)),
      p(strong("Course Number:"), record$coursenumber),
      p(strong("Course Name:"), record$coursename)
    )
  })

  # --- Download Handler ---
  output$downloadData <- downloadHandler(
    filename = function() {
      paste("filtered_records_", Sys.Date(), ".csv", sep = "")
    },
    content = function(file) {
      write_csv(filtered_data(), file)
    }
  )

}

# --- 5. Run the App ---
shinyApp(ui = ui, server = server)
