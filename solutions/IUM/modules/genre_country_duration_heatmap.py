import plotly.express as px
import plotly.graph_objects as go
import pandas as pd

def plot_duration_heatmap(
        heatmap_data_durata,
        rating_medio_per_genere,
        rating_medio_per_nazione,
        custom_palette,
        legend_labels
):
    """
    Crea una heatmap interattiva (Plotly) che mostra la durata media dei film per nazione e genere,
    arricchita da annotazioni personalizzate che rappresentano il rating medio.

    La visualizzazione include:
    - Heatmap con la durata media dei film come valore centrale
    - Annotazioni del rating medio per ogni combinazione nazione-genere (colore dinamico in base al rating)
    - Media dei rating per genere (sopra la heatmap) e per nazione (a destra)
    - Legenda dinamica con indicatori di colore per ciascun intervallo di rating

    Args:
        heatmap_data_durata (pd.DataFrame): DataFrame contenente le colonne:
            - 'genre': genere cinematografico
            - 'country': nazione di produzione
            - 'durata_media': durata media dei film
            - 'rating_medio': rating medio per combinazione nazione-genere
        rating_medio_per_genere (pd.DataFrame): DataFrame con i rating medi per ciascun genere:
            - Colonne: 'genre', 'rating_medio_genere'
        rating_medio_per_nazione (pd.DataFrame): DataFrame con i rating medi per ciascuna nazione:
            - Colonne: 'country', 'rating_medio_nazione'
        custom_palette (Dict[pd.Interval, str]): Mappa degli intervalli di rating ai colori (esadecimali).
        legend_labels (Dict[str, str]): Mappa testo-intervallo per creare la legenda custom dei rating.

    Returns:
        plotly.graph_objects.Figure: Oggetto figura contenente la heatmap interattiva completa.
    """
    """
    Crea la visualizzazione della heatmap della durata con Plotly.
    Riceve i dati già processati e si occupa solo del rendering grafico.
    """

    def get_color_for_rating(rating):
        """Mappa il rating a un colore dalla palette"""
        for interval, color in custom_palette.items():
            if interval.left < rating <= interval.right:
                return color
        return '#000000'

    # Crea la heatmap base
    fig = px.density_heatmap(
        heatmap_data_durata,
        x='genre',
        y='country',
        z='durata_media',
        histfunc='avg',
        title='Heatmap: Durata media dei film per nazione e genere',
        labels={
            'genre': 'Genere',
            'country': 'Nazione',
            'durata_media': 'Durata (minuti)'
        },
        color_continuous_scale=px.colors.sequential.Viridis,
        color_continuous_midpoint=150,
        range_color=[0, 300]
    )

    # Aggiungi annotazioni con il rating medio e colore personalizzato
    for i, row in heatmap_data_durata.iterrows():
        fig.add_annotation(
            x=row['genre'], y=row['country'],
            text=f"{row['rating_medio']:.2f}",
            showarrow=False,
            font=dict(size=10, color=get_color_for_rating(row['rating_medio']))
        )

    # Aggiungi una seconda asse x con il rating medio per genere
    for i, row in rating_medio_per_genere.iterrows():
        fig.add_annotation(
            x=row['genre'], y=1.07,
            text=f"{row['rating_medio_genere']:.2f}",
            showarrow=False,
            font=dict(size=10, color=get_color_for_rating(row['rating_medio_genere'])),
            xref='x', yref='paper'
        )

    # Aggiungi la scritta "Rating" sopra la riga delle medie per genere
    fig.add_annotation(
        x=-1.1, y=1.1,
        text="Rating",
        showarrow=False,
        font=dict(size=12, color='white'),
        xref='x', yref='paper'
    )

    fig.add_annotation(
        x=-1.1, y=1.05,
        text="medio",
        showarrow=False,
        font=dict(size=12, color='white'),
        xref='x', yref='paper'
    )

    # Aggiungi una colonna a destra con il rating medio per nazione
    for i, row in rating_medio_per_nazione.iterrows():
        fig.add_annotation(
            x=1.04, y=row['country'],
            text=f"{row['rating_medio_nazione']:.2f}",
            showarrow=False,
            font=dict(size=10, color=get_color_for_rating(row['rating_medio_nazione'])),
            xref='paper', yref='y'
        )

    # Aggiungi la scritta "Rating" nella colonna delle medie per nazione
    fig.add_annotation(
        x=1.05, y=-0.5,
        text="Rating",
        showarrow=False,
        font=dict(size=12, color='white'),
        xref='paper', yref='y'
    )

    fig.add_annotation(
        x=1.05, y=-1,
        text="medio",
        showarrow=False,
        font=dict(size=12, color='white'),
        xref='paper', yref='y'
    )

    # Aggiungi le tracce per la legenda
    for interval, label in legend_labels.items():
        fig.add_trace(go.Scatter(
            x=[None],
            y=[None],
            mode='markers',
            marker=dict(size=10, color=custom_palette[
                pd.Interval(float(interval.split(',')[0].strip('(')),
                            float(interval.split(',')[1].strip(']')),
                            closed='right')]),
            name=f'Rating {label}'
        ))

    # Personalizza il layout
    fig.update_layout(
        xaxis_title='Genere',
        yaxis_title='Nazione',
        coloraxis_colorbar_title='Durata (minuti)',
        coloraxis_colorbar=dict(x=1.06, tickvals=list(range(0, 301, 50))),
        legend_title='Rating medio',
        legend=dict(x=1.17, y=0.83),
        margin=dict(l=110, r=150)
    )

    return fig